
CREATE OR REPLACE FUNCTION public.dashboard_estado_personal_hoy()
RETURNS TABLE(
  empleado_id uuid,
  nombre text,
  apellido text,
  avatar_url text,
  puesto text,
  sucursal_id uuid,
  sucursal_nombre text,
  estado text,
  hora_entrada timestamptz,
  hora_evento timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_dow int := EXTRACT(ISODOW FROM v_hoy)::int;
  v_is_admin boolean := has_role(auth.uid(), 'admin_rrhh');
  v_is_gerente boolean := has_role(auth.uid(), 'gerente_sucursal');
  v_user_empleado_id uuid;
BEGIN
  SELECT e.id INTO v_user_empleado_id FROM empleados e WHERE e.user_id = auth.uid() LIMIT 1;

  RETURN QUERY
  WITH base AS (
    SELECT e.id AS emp_id, e.nombre AS emp_nombre, e.apellido AS emp_apellido,
           e.avatar_url AS emp_avatar, e.puesto AS emp_puesto,
           e.sucursal_id AS emp_suc_id, s.nombre AS emp_suc_nombre
    FROM empleados e
    LEFT JOIN sucursales s ON s.id = e.sucursal_id
    WHERE e.activo = true
      AND (
        v_is_admin
        OR (v_is_gerente AND e.sucursal_id IN (
              SELECT a.sucursal_id FROM asignacion_empleado_sucursal a
              WHERE a.empleado_id = v_user_empleado_id
                AND (a.fecha_hasta IS NULL OR a.fecha_hasta >= v_hoy)
                AND a.fecha_desde <= v_hoy
            ))
      )
  ),
  vac AS (
    SELECT DISTINCT sv.empleado_id AS emp_id FROM solicitudes_vacaciones sv
    WHERE sv.estado = 'aprobada' AND v_hoy BETWEEN sv.fecha_inicio AND sv.fecha_fin
  ),
  lic AS (
    SELECT DISTINCT am.empleado_id AS emp_id FROM ausencias_medicas am
    WHERE v_hoy BETWEEN am.fecha_inicio AND COALESCE(am.fecha_fin, v_hoy)
  ),
  fich_hoy AS (
    SELECT f.empleado_id AS emp_id, f.tipo, f.timestamp_aplicado,
      ROW_NUMBER() OVER (PARTITION BY f.empleado_id ORDER BY f.timestamp_aplicado DESC) AS rn,
      MIN(CASE WHEN f.tipo = 'entrada' THEN f.timestamp_aplicado END)
        OVER (PARTITION BY f.empleado_id) AS primer_entrada
    FROM fichajes f
    WHERE (f.timestamp_aplicado AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = v_hoy
  ),
  fich_estado AS (
    SELECT emp_id, tipo AS ultimo_tipo, timestamp_aplicado AS ultimo_ts, primer_entrada
    FROM fich_hoy WHERE rn = 1
  ),
  turno_hoy AS (
    SELECT DISTINCT et.empleado_id AS emp_id
    FROM empleado_turnos et
    JOIN fichado_turnos ft ON ft.id = et.turno_id
    WHERE et.activo = true
      AND et.fecha_inicio <= v_hoy
      AND (et.fecha_fin IS NULL OR et.fecha_fin >= v_hoy)
      AND ft.activo = true
      AND v_dow = ANY(ft.dias_semana)
  )
  SELECT
    b.emp_id, b.emp_nombre, b.emp_apellido, b.emp_avatar, b.emp_puesto,
    b.emp_suc_id, b.emp_suc_nombre,
    CASE
      WHEN vac.emp_id IS NOT NULL THEN 'vacaciones'
      WHEN lic.emp_id IS NOT NULL THEN 'licencia'
      WHEN fe.ultimo_tipo = 'pausa_inicio' THEN 'descanso'
      WHEN fe.ultimo_tipo IN ('entrada','pausa_fin') THEN 'trabajando'
      WHEN fe.ultimo_tipo = 'salida' THEN 'finalizado'
      WHEN th.emp_id IS NOT NULL THEN 'ausente'
      ELSE 'franco'
    END,
    fe.primer_entrada, fe.ultimo_ts
  FROM base b
  LEFT JOIN vac ON vac.emp_id = b.emp_id
  LEFT JOIN lic ON lic.emp_id = b.emp_id
  LEFT JOIN fich_estado fe ON fe.emp_id = b.emp_id
  LEFT JOIN turno_hoy th ON th.emp_id = b.emp_id;
END;
$$;
