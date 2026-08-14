CREATE OR REPLACE FUNCTION public.get_indice_ausentismo(
  p_desde date,
  p_hasta date,
  p_sucursales uuid[] DEFAULT NULL::uuid[],
  p_empleados uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE(
  empleado_id uuid,
  empleado_nombre text,
  empleado_apellido text,
  empleado_legajo text,
  sucursal_id uuid,
  sucursal_nombre text,
  fecha date,
  dia_semana integer,
  estado text,
  es_esperado boolean,
  es_ausente boolean,
  horas_esperadas numeric,
  categoria_id uuid,
  categoria_nombre text,
  categoria_color text,
  es_justificada boolean,
  observacion text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    (n.estado IN ('TRABAJADO', 'NO_FICHADA')) AS es_esperado,
    (n.estado = 'NO_FICHADA') AS es_ausente,
    COALESCE(n.horas_esperadas, 0) AS horas_esperadas,
    j.categoria_id,
    c.nombre,
    c.color,
    c.es_justificada,
    j.observacion
  FROM public.get_novedades_liquidacion(p_desde, p_hasta, p_sucursales, p_empleados) n
  LEFT JOIN public.justificaciones_asistencia j
    ON j.tipo_evento = 'ausencia'
   AND j.empleado_id = n.empleado_id
   AND j.fecha_evento = n.fecha
  LEFT JOIN public.categorias_justificacion_asistencia c ON c.id = j.categoria_id
  WHERE n.estado IN ('TRABAJADO', 'NO_FICHADA');
$function$;

REVOKE ALL ON FUNCTION public.get_indice_ausentismo(date, date, uuid[], uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_indice_ausentismo(date, date, uuid[], uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_indice_ausentismo(date, date, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_indice_ausentismo(date, date, uuid[], uuid[]) TO service_role;