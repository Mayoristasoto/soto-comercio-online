CREATE TABLE public.encargado_equipo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gerente_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gerente_id, empleado_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encargado_equipo TO authenticated;
GRANT ALL ON public.encargado_equipo TO service_role;
ALTER TABLE public.encargado_equipo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona equipos de encargados" ON public.encargado_equipo
  FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE POLICY "Encargado ve su equipo configurado" ON public.encargado_equipo
  FOR SELECT TO authenticated USING (gerente_id = public.current_empleado_id());
CREATE INDEX encargado_equipo_gerente_idx ON public.encargado_equipo (gerente_id);

-- Empleados que ve un encargado: los configurados por RRHH; si no hay configuración, los de su sucursal.
CREATE OR REPLACE FUNCTION public.encargado_empleados_visibles(_gerente uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id FROM public.encargado_equipo q JOIN public.empleados e ON e.id = q.empleado_id
   WHERE q.gerente_id = _gerente AND e.activo
  UNION
  SELECT e.id FROM public.empleados e, public.empleados g
   WHERE g.id = _gerente AND e.activo AND g.sucursal_id IS NOT NULL AND e.sucursal_id = g.sucursal_id
     AND NOT EXISTS (SELECT 1 FROM public.encargado_equipo q2 WHERE q2.gerente_id = _gerente)
$$;
REVOKE ALL ON FUNCTION public.encargado_empleados_visibles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encargado_empleados_visibles(uuid) TO authenticated;

-- Semana del panel de encargado: empleados visibles, plan elegido por sucursal, turnos y ausencias.
CREATE OR REPLACE FUNCTION public.panel_encargado_semana(p_semana date, p_gerente uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rrhh boolean := public.h2_es_rrhh();
  v_ger uuid;
  v_ids uuid[];
  v_fin date := p_semana + 6;
BEGIN
  IF p_gerente IS NOT NULL THEN
    IF NOT v_rrhh THEN RAISE EXCEPTION 'Solo RRHH puede ver el panel como otro encargado'; END IF;
    v_ger := p_gerente;
  ELSIF v_rrhh THEN
    v_ger := NULL;
  ELSIF public.has_role(auth.uid(), 'gerente_sucursal'::user_role) THEN
    v_ger := public.current_empleado_id();
  ELSE
    RAISE EXCEPTION 'Sin permiso';
  END IF;

  IF v_ger IS NULL THEN
    SELECT array_agg(id) INTO v_ids FROM public.empleados WHERE activo;
  ELSE
    SELECT array_agg(x) INTO v_ids FROM public.encargado_empleados_visibles(v_ger) x;
  END IF;
  v_ids := coalesce(v_ids, '{}');

  RETURN (
    WITH planes AS (
      SELECT DISTINCT ON (p.sucursal_id) p.id, p.sucursal_id, p.estado, p.version
        FROM public.h2_planes p WHERE p.semana_inicio = p_semana
       ORDER BY p.sucursal_id,
         CASE p.estado WHEN 'publicado' THEN 5 WHEN 'aprobado' THEN 4 WHEN 'pendiente' THEN 3 WHEN 'devuelto' THEN 2 WHEN 'borrador' THEN 1 ELSE 0 END DESC,
         p.version DESC NULLS LAST
    ), tu AS (
      SELECT t.empleado_id, t.fecha, t.hora_entrada, t.hora_salida, t.descanso_inicio, t.descanso_fin, t.puesto_id,
             coalesce(t.sucursal_id, pl.sucursal_id) AS sucursal_id
        FROM public.h2_turnos t JOIN planes pl ON pl.id = t.plan_id
       WHERE t.empleado_id = ANY (v_ids)
    ), emps AS (
      SELECT id, nombre, apellido, sucursal_id, puesto_id FROM public.empleados WHERE id = ANY (v_ids)
    )
    SELECT jsonb_build_object(
      'empleados', coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.apellido, e.nombre) FROM emps e), '[]'),
      'turnos', coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM tu t), '[]'),
      'planes', coalesce((SELECT jsonb_agg(to_jsonb(pl)) FROM planes pl
                 WHERE pl.sucursal_id IN (SELECT sucursal_id FROM emps WHERE sucursal_id IS NOT NULL UNION SELECT sucursal_id FROM tu)), '[]'),
      'ausencias', coalesce((SELECT jsonb_agg(a) FROM (
          SELECT jsonb_build_object('empleado_id', v.empleado_id, 'desde', v.fecha_inicio, 'hasta', v.fecha_fin, 'tipo', 'Vacaciones') a
            FROM public.solicitudes_vacaciones v
           WHERE v.empleado_id = ANY (v_ids) AND v.estado IN ('aprobada','gozadas') AND v.fecha_inicio <= v_fin AND v.fecha_fin >= p_semana
          UNION ALL
          SELECT jsonb_build_object('empleado_id', m.empleado_id, 'desde', m.fecha_inicio, 'hasta', m.fecha_fin, 'tipo', 'Licencia médica')
            FROM public.ausencias_medicas m
           WHERE m.empleado_id = ANY (v_ids) AND m.fecha_inicio <= v_fin AND m.fecha_fin >= p_semana
        ) s), '[]')
    )
  );
END $$;
REVOKE ALL ON FUNCTION public.panel_encargado_semana(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_encargado_semana(date, uuid) TO authenticated;

-- Los encargados pueden pedir ajustes y ver pedidos de los empleados que RRHH les asignó.
CREATE POLICY "Encargado pide cambios de su equipo visible" ON public.cambios_horario
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gerente_sucursal'::user_role)
    AND empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())));
CREATE POLICY "Encargado ve cambios de su equipo visible" ON public.cambios_horario
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gerente_sucursal'::user_role)
    AND empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())));