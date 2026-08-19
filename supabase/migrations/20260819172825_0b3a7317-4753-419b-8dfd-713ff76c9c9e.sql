CREATE OR REPLACE FUNCTION public.get_indice_ausentismo(
  p_desde date,
  p_hasta date,
  p_sucursales uuid[] DEFAULT NULL::uuid[],
  p_empleados uuid[] DEFAULT NULL::uuid[],
  p_excluir_vacaciones boolean DEFAULT true
)
 RETURNS TABLE(empleado_id uuid, empleado_nombre text, empleado_apellido text, empleado_legajo text, sucursal_id uuid, sucursal_nombre text, fecha date, dia_semana integer, estado text, es_esperado boolean, es_ausente boolean, horas_esperadas numeric, categoria_id uuid, categoria_nombre text, categoria_color text, es_justificada boolean, observacion text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH emp AS (
    SELECT e.id, e.nombre, e.apellido, e.legajo, e.sucursal_id AS suc_id, s.nombre AS sucursal_nombre
    FROM public.empleados e
    LEFT JOIN public.sucursales s ON s.id = e.sucursal_id
    WHERE e.activo = true
      AND (p_sucursales IS NULL OR e.sucursal_id = ANY(p_sucursales))
      AND (p_empleados IS NULL OR e.id = ANY(p_empleados))
  ),
  base AS (
    SELECT
      n.empleado_id,
      n.empleado_nombre,
      n.empleado_apellido,
      n.empleado_legajo,
      n.sucursal_id,
      n.sucursal_nombre,
      n.fecha,
      n.dia_semana,
      n.estado,
      true AS es_esperado,
      (n.estado <> 'TRABAJADO') AS es_ausente,
      COALESCE(n.horas_esperadas, 0) AS horas_esperadas,
      j.categoria_id,
      CASE
        WHEN n.estado = 'NO_FICHADA' THEN c.nombre
        WHEN n.estado = 'LIC_MEDICA' THEN COALESCE('Licencia médica: ' || n.detalle, 'Licencia médica')
        WHEN n.estado = 'VACACIONES' THEN 'Vacaciones'
        WHEN n.estado = 'TRABAJADO' THEN NULL
        ELSE COALESCE(n.detalle, INITCAP(REPLACE(n.estado, '_', ' ')))
      END AS categoria_nombre,
      CASE WHEN n.estado = 'NO_FICHADA' THEN c.color ELSE NULL END AS categoria_color,
      CASE
        WHEN n.estado = 'NO_FICHADA' THEN c.es_justificada
        WHEN n.estado = 'TRABAJADO' THEN NULL
        ELSE true
      END AS es_justificada,
      j.observacion
    FROM public.get_novedades_liquidacion(p_desde, p_hasta, p_sucursales, p_empleados) n
    LEFT JOIN public.justificaciones_asistencia j
      ON j.tipo_evento = 'ausencia'
     AND j.empleado_id = n.empleado_id
     AND j.fecha_evento = n.fecha
    LEFT JOIN public.categorias_justificacion_asistencia c ON c.id = j.categoria_id
    WHERE n.estado <> 'FERIADO'
      AND (n.estado <> 'VACACIONES' OR NOT p_excluir_vacaciones)
  ),
  -- Ausencias justificadas cargadas manualmente (aunque el empleado no tuviera turno o el día fuera feriado)
  extra_just AS (
    SELECT
      e.id AS empleado_id, e.nombre, e.apellido, e.legajo, e.suc_id, e.sucursal_nombre,
      j.fecha_evento AS fecha,
      j.categoria_id, c.nombre AS cat_nombre, c.color AS cat_color,
      COALESCE(c.es_justificada, true) AS es_just,
      j.observacion
    FROM public.justificaciones_asistencia j
    JOIN emp e ON e.id = j.empleado_id
    LEFT JOIN public.categorias_justificacion_asistencia c ON c.id = j.categoria_id
    WHERE j.tipo_evento = 'ausencia'
      AND j.fecha_evento BETWEEN p_desde AND p_hasta
  ),
  extra_med AS (
    SELECT
      e.id AS empleado_id, e.nombre, e.apellido, e.legajo, e.suc_id, e.sucursal_nombre,
      d::date AS fecha,
      NULL::uuid AS categoria_id,
      COALESCE('Licencia médica: ' || am.tipo_enfermedad, 'Licencia médica') AS cat_nombre,
      NULL::text AS cat_color,
      true AS es_just,
      NULL::text AS observacion
    FROM public.ausencias_medicas am
    JOIN emp e ON e.id = am.empleado_id
    CROSS JOIN LATERAL generate_series(
      GREATEST(am.fecha_inicio, p_desde),
      LEAST(am.fecha_fin, p_hasta),
      interval '1 day'
    ) d
    WHERE am.fecha_inicio <= p_hasta AND am.fecha_fin >= p_desde
  ),
  extras AS (
    SELECT * FROM extra_just
    UNION ALL
    SELECT * FROM extra_med
  )
  SELECT * FROM base
  UNION ALL
  SELECT
    x.empleado_id, x.nombre, x.apellido, x.legajo, x.suc_id, x.sucursal_nombre,
    x.fecha,
    EXTRACT(DOW FROM x.fecha)::int,
    'AUSENCIA_JUSTIFICADA'::text,
    true, true, 0::numeric,
    x.categoria_id, x.cat_nombre, x.cat_color, x.es_just, x.observacion
  FROM extras x
  WHERE EXTRACT(DOW FROM x.fecha)::int <> 0
    AND NOT EXISTS (
      SELECT 1 FROM base b WHERE b.empleado_id = x.empleado_id AND b.fecha = x.fecha
    );
$function$;