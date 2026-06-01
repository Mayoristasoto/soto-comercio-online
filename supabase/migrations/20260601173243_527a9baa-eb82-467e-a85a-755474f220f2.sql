
CREATE OR REPLACE FUNCTION public.get_novedades_liquidacion(
  p_desde date,
  p_hasta date,
  p_sucursales uuid[] DEFAULT NULL,
  p_empleados uuid[] DEFAULT NULL
)
RETURNS TABLE (
  empleado_id uuid,
  empleado_nombre text,
  empleado_apellido text,
  empleado_legajo text,
  sucursal_id uuid,
  sucursal_nombre text,
  fecha date,
  dia_semana integer,
  estado text,
  detalle text,
  hora_entrada_esperada time,
  hora_salida_esperada time,
  horas_esperadas numeric,
  horas_trabajadas numeric,
  turno_nombre text,
  feriado_nombre text,
  justificacion_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp record;
  v_d date;
  v_dow int;
  v_turno_id uuid;
  v_turno_nombre text;
  v_turno_dias int[];
  v_turno_he time;
  v_turno_hs time;
  v_horarios jsonb;
  v_he time;
  v_hs time;
  v_horas_esp numeric;
  v_horas_trab numeric;
  v_estado text;
  v_detalle text;
  v_fer_id uuid;
  v_fer_nombre text;
  v_vac_id uuid;
  v_aus_id uuid;
  v_aus_tipo text;
  v_sol_id uuid;
  v_sol_tipo text;
  v_sol_desc text;
  v_first_in timestamptz;
  v_last_out timestamptz;
BEGIN
  FOR v_emp IN
    SELECT e.id, e.nombre, e.apellido, e.legajo, e.sucursal_id AS suc_id, s.nombre AS sucursal_nombre
    FROM public.empleados e
    LEFT JOIN public.sucursales s ON s.id = e.sucursal_id
    WHERE e.activo = true
      AND (p_sucursales IS NULL OR e.sucursal_id = ANY(p_sucursales))
      AND (p_empleados IS NULL OR e.id = ANY(p_empleados))
      AND (e.fecha_baja IS NULL OR e.fecha_baja >= p_desde)
  LOOP
    v_d := p_desde;
    WHILE v_d <= p_hasta LOOP
      v_dow := EXTRACT(DOW FROM v_d)::int;

      v_turno_id := NULL; v_turno_nombre := NULL; v_turno_dias := NULL;
      v_turno_he := NULL; v_turno_hs := NULL; v_horarios := NULL;

      SELECT t.id, t.nombre, t.dias_semana, t.hora_entrada, t.hora_salida, t.horarios_por_dia
        INTO v_turno_id, v_turno_nombre, v_turno_dias, v_turno_he, v_turno_hs, v_horarios
      FROM public.empleado_turnos et
      JOIN public.fichado_turnos t ON t.id = et.turno_id
      WHERE et.empleado_id = v_emp.id
        AND COALESCE(et.activo, true) = true
        AND et.fecha_inicio <= v_d
        AND (et.fecha_fin IS NULL OR et.fecha_fin >= v_d)
      ORDER BY et.fecha_inicio DESC
      LIMIT 1;

      v_estado := NULL; v_detalle := NULL;
      v_he := NULL; v_hs := NULL;
      v_horas_esp := 0; v_horas_trab := 0;
      v_fer_id := NULL; v_fer_nombre := NULL;
      v_vac_id := NULL;
      v_aus_id := NULL; v_aus_tipo := NULL;
      v_sol_id := NULL; v_sol_tipo := NULL; v_sol_desc := NULL;
      v_first_in := NULL; v_last_out := NULL;

      IF v_turno_id IS NULL THEN
        v_d := v_d + 1;
        CONTINUE;
      END IF;

      IF v_horarios IS NOT NULL AND v_horarios ? v_dow::text THEN
        v_he := (v_horarios -> v_dow::text ->> 'hora_entrada')::time;
        v_hs := (v_horarios -> v_dow::text ->> 'hora_salida')::time;
      ELSIF v_turno_dias IS NOT NULL AND v_dow = ANY(v_turno_dias) THEN
        v_he := v_turno_he;
        v_hs := v_turno_hs;
      ELSE
        v_d := v_d + 1;
        CONTINUE;
      END IF;

      IF v_he IS NOT NULL AND v_hs IS NOT NULL THEN
        v_horas_esp := EXTRACT(EPOCH FROM (v_hs - v_he)) / 3600.0;
        IF v_horas_esp < 0 THEN v_horas_esp := v_horas_esp + 24; END IF;
      END IF;

      SELECT f.id, f.nombre INTO v_fer_id, v_fer_nombre
      FROM public.dias_feriados f
      WHERE f.fecha = v_d AND COALESCE(f.activo, true) = true
      LIMIT 1;

      IF v_fer_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.feriado_empleados_asignados fea WHERE fea.feriado_id = v_fer_id) THEN
          IF EXISTS (
            SELECT 1 FROM public.feriado_empleados_asignados fea
            WHERE fea.feriado_id = v_fer_id AND fea.empleado_id = v_emp.id
          ) THEN
            v_estado := 'FERIADO';
            v_detalle := v_fer_nombre;
          END IF;
        ELSE
          v_estado := 'FERIADO';
          v_detalle := v_fer_nombre;
        END IF;
      END IF;

      IF v_estado IS NULL THEN
        SELECT sv.id INTO v_vac_id
        FROM public.solicitudes_vacaciones sv
        WHERE sv.empleado_id = v_emp.id
          AND sv.estado IN ('aprobada','gozadas')
          AND sv.fecha_inicio <= v_d AND sv.fecha_fin >= v_d
        LIMIT 1;
        IF v_vac_id IS NOT NULL THEN
          v_estado := 'VACACIONES';
          v_detalle := 'Vacaciones aprobadas';
        END IF;
      END IF;

      IF v_estado IS NULL THEN
        SELECT am.id, am.tipo_enfermedad INTO v_aus_id, v_aus_tipo
        FROM public.ausencias_medicas am
        WHERE am.empleado_id = v_emp.id
          AND am.fecha_inicio <= v_d AND am.fecha_fin >= v_d
        LIMIT 1;
        IF v_aus_id IS NOT NULL THEN
          v_estado := 'LIC_MEDICA';
          v_detalle := COALESCE(v_aus_tipo, 'Licencia médica');
        END IF;
      END IF;

      IF v_estado IS NULL THEN
        SELECT sg.id, sg.tipo_solicitud, sg.descripcion INTO v_sol_id, v_sol_tipo, v_sol_desc
        FROM public.solicitudes_generales sg
        WHERE sg.empleado_id = v_emp.id
          AND sg.estado = 'aprobada'
          AND sg.fecha_solicitud = v_d
        ORDER BY sg.created_at DESC
        LIMIT 1;
        IF v_sol_id IS NOT NULL THEN
          v_estado := UPPER(v_sol_tipo);
          v_detalle := COALESCE(v_sol_desc, v_sol_tipo);
        END IF;
      END IF;

      SELECT MIN(fi.timestamp_real) FILTER (WHERE fi.tipo = 'entrada'),
             MAX(fi.timestamp_real) FILTER (WHERE fi.tipo = 'salida')
        INTO v_first_in, v_last_out
      FROM public.fichajes fi
      WHERE fi.empleado_id = v_emp.id
        AND DATE(fi.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = v_d
        AND fi.estado IN ('valido','corregido');

      IF v_first_in IS NOT NULL AND v_last_out IS NOT NULL THEN
        v_horas_trab := EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 3600.0;
      END IF;

      IF v_estado IS NULL THEN
        IF v_first_in IS NOT NULL THEN
          v_estado := 'TRABAJADO';
        ELSE
          v_estado := 'NO_FICHADA';
          v_detalle := 'Sin fichaje registrado';
        END IF;
      ELSIF v_first_in IS NOT NULL AND v_estado = 'FERIADO' THEN
        v_detalle := COALESCE(v_detalle,'') || ' (trabajado)';
      END IF;

      empleado_id := v_emp.id;
      empleado_nombre := v_emp.nombre;
      empleado_apellido := v_emp.apellido;
      empleado_legajo := v_emp.legajo;
      sucursal_id := v_emp.suc_id;
      sucursal_nombre := v_emp.sucursal_nombre;
      fecha := v_d;
      dia_semana := v_dow;
      estado := v_estado;
      detalle := v_detalle;
      hora_entrada_esperada := v_he;
      hora_salida_esperada := v_hs;
      horas_esperadas := v_horas_esp;
      horas_trabajadas := v_horas_trab;
      turno_nombre := v_turno_nombre;
      feriado_nombre := v_fer_nombre;
      justificacion_id := COALESCE(v_sol_id, v_aus_id, v_vac_id);
      RETURN NEXT;

      v_d := v_d + 1;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_novedades_liquidacion(date, date, uuid[], uuid[]) TO authenticated, service_role;
