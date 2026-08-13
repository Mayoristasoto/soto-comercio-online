-- 1) Marca de categorías frecuentes
ALTER TABLE public.categorias_justificacion_asistencia
  ADD COLUMN IF NOT EXISTS frecuente boolean NOT NULL DEFAULT false;

UPDATE public.categorias_justificacion_asistencia
SET frecuente = true
WHERE lower(nombre) ~ '(vacacion|licencia m|turno m|franco|corte de luz|transporte)';

-- 2) Sugerencias automáticas de justificación
CREATE OR REPLACE FUNCTION public.get_sugerencias_justificacion(
  p_desde date,
  p_hasta date,
  p_empleados uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE(empleado_id uuid, fecha date, origen text, detalle text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Vacaciones aprobadas o gozadas
  SELECT sv.empleado_id, d::date, 'vacaciones'::text,
         ('Vacaciones ' || sv.estado::text)::text
  FROM public.solicitudes_vacaciones sv
  CROSS JOIN generate_series(
    greatest(sv.fecha_inicio, p_desde),
    least(sv.fecha_fin, p_hasta),
    interval '1 day') d
  WHERE sv.estado IN ('aprobada','gozadas')
    AND sv.fecha_inicio <= p_hasta AND sv.fecha_fin >= p_desde
    AND (p_empleados IS NULL OR sv.empleado_id = ANY(p_empleados))

  UNION ALL
  -- Licencias médicas
  SELECT am.empleado_id, d::date, 'licencia_medica'::text,
         ('Licencia médica: ' || coalesce(am.tipo_enfermedad, 'sin detalle'))::text
  FROM public.ausencias_medicas am
  CROSS JOIN generate_series(
    greatest(am.fecha_inicio, p_desde),
    least(am.fecha_fin, p_hasta),
    interval '1 day') d
  WHERE am.fecha_inicio <= p_hasta AND am.fecha_fin >= p_desde
    AND (p_empleados IS NULL OR am.empleado_id = ANY(p_empleados))

  UNION ALL
  -- Solicitudes generales aprobadas
  SELECT sg.empleado_id, sg.fecha_solicitud, 'solicitud'::text,
         ('Solicitud aprobada: ' || sg.tipo_solicitud)::text
  FROM public.solicitudes_generales sg
  WHERE sg.estado = 'aprobada'
    AND sg.fecha_solicitud BETWEEN p_desde AND p_hasta
    AND (p_empleados IS NULL OR sg.empleado_id = ANY(p_empleados));
$$;

GRANT EXECUTE ON FUNCTION public.get_sugerencias_justificacion(date, date, uuid[]) TO authenticated;

-- 3) Generación de tareas semanales de justificación
CREATE OR REPLACE FUNCTION public.generar_tareas_justificacion_semana(
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desde date;
  v_hasta date;
  v_titulo text;
  v_creadas integer := 0;
  v_total integer;
  r record;
  v_pend integer;
BEGIN
  v_desde := coalesce(p_desde, (date_trunc('week', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 7))::date);
  v_hasta := coalesce(p_hasta, v_desde + 6);
  v_titulo := 'Justificar ausencias semana ' || to_char(v_desde,'DD/MM') || ' - ' || to_char(v_hasta,'DD/MM');

  SELECT count(*) INTO v_total
  FROM public.get_eventos_asistencia(v_desde, v_hasta, NULL, NULL, ARRAY['llegada_tarde','ausencia']) ev
  WHERE ev.categoria_id IS NULL;

  IF coalesce(v_total,0) = 0 THEN
    RETURN 0;
  END IF;

  -- RRHH: todas las sucursales
  FOR r IN
    SELECT id FROM public.empleados WHERE activo = true AND rol = 'admin_rrhh'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.tareas t
      WHERE t.titulo = v_titulo AND t.asignado_a = r.id
    ) THEN
      INSERT INTO public.tareas (titulo, descripcion, asignado_a, prioridad, estado, fecha_limite, tipo_asignacion)
      VALUES (
        v_titulo,
        v_total || ' evento(s) sin justificar. Revisar en /rrhh/informe-asistencia-gerencial?desde=' || v_desde || '&hasta=' || v_hasta,
        r.id, 'media', 'pendiente', v_hasta + 7, 'individual'
      );
      v_creadas := v_creadas + 1;
    END IF;
  END LOOP;

  -- Encargados: solo su sucursal y si tienen pendientes
  FOR r IN
    SELECT e.id, e.sucursal_id
    FROM public.empleados e
    WHERE e.activo = true AND e.rol = 'gerente_sucursal' AND e.sucursal_id IS NOT NULL
  LOOP
    SELECT count(*) INTO v_pend
    FROM public.get_eventos_asistencia(v_desde, v_hasta, ARRAY[r.sucursal_id], NULL, ARRAY['llegada_tarde','ausencia']) ev
    WHERE ev.categoria_id IS NULL;

    IF coalesce(v_pend,0) > 0 AND NOT EXISTS (
      SELECT 1 FROM public.tareas t
      WHERE t.titulo = v_titulo AND t.asignado_a = r.id
    ) THEN
      INSERT INTO public.tareas (titulo, descripcion, asignado_a, prioridad, estado, fecha_limite, tipo_asignacion)
      VALUES (
        v_titulo,
        v_pend || ' evento(s) sin justificar en tu sucursal. Revisar en /rrhh/informe-asistencia-gerencial?desde=' || v_desde || '&hasta=' || v_hasta || '&sucursal=' || r.sucursal_id,
        r.id, 'media', 'pendiente', v_hasta + 7, 'individual'
      );
      v_creadas := v_creadas + 1;
    END IF;
  END LOOP;

  RETURN v_creadas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generar_tareas_justificacion_semana(date, date) TO authenticated;

-- 4) Cron semanal: lunes 12:00 UTC = 09:00 Argentina
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('generar-tareas-justificacion-semanal')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generar-tareas-justificacion-semanal');
    PERFORM cron.schedule(
      'generar-tareas-justificacion-semanal',
      '0 12 * * 1',
      $cron$SELECT public.generar_tareas_justificacion_semana();$cron$
    );
  END IF;
END $$;