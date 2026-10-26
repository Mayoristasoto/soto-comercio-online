DO $$
DECLARE s record; v_plan uuid; v_lunes date := date '2026-10-26';
BEGIN
  FOR s IN SELECT DISTINCT e.sucursal_id FROM empleados e JOIN empleado_turnos et ON et.empleado_id=e.id AND et.activo WHERE e.activo AND e.sucursal_id IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM h2_planes WHERE sucursal_id=s.sucursal_id AND semana_inicio=v_lunes) THEN CONTINUE; END IF;
    INSERT INTO h2_planes(sucursal_id, semana_inicio, estado, version, vigente)
    VALUES (s.sucursal_id, v_lunes, 'borrador', 1, true) RETURNING id INTO v_plan;
    INSERT INTO h2_turnos(plan_id, empleado_id, fecha, hora_entrada, hora_salida, puesto_id, sucursal_id, descanso_inicio, descanso_fin, observaciones)
    SELECT DISTINCT ON (e.id, d.f) v_plan, e.id, d.f,
      COALESCE((ft.horarios_por_dia->(extract(isodow from d.f)::int::text)->>'hora_entrada')::time, ft.hora_entrada),
      COALESCE((ft.horarios_por_dia->(extract(isodow from d.f)::int::text)->>'hora_salida')::time, ft.hora_salida),
      e.puesto_id, e.sucursal_id, ft.hora_pausa_inicio, ft.hora_pausa_fin, 'Importado de horarios legacy: '||ft.nombre
    FROM empleados e
    JOIN empleado_turnos et ON et.empleado_id=e.id AND et.activo
    JOIN fichado_turnos ft ON ft.id=et.turno_id AND ft.activo
    CROSS JOIN generate_series(v_lunes, v_lunes+6, interval '1 day') g(x)
    CROSS JOIN LATERAL (SELECT g.x::date AS f) d
    WHERE e.activo AND e.sucursal_id=s.sucursal_id
      AND d.f BETWEEN COALESCE(et.fecha_inicio, d.f) AND COALESCE(et.fecha_fin, d.f)
      AND (ft.dias_semana IS NULL OR extract(isodow from d.f)::int = ANY(ft.dias_semana) OR (extract(isodow from d.f)=7 AND 0 = ANY(ft.dias_semana)))
    ORDER BY e.id, d.f, et.fecha_inicio DESC NULLS LAST;
  END LOOP;
END $$;