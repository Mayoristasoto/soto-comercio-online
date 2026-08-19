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
    AND (n.estado <> 'VACACIONES' OR NOT p_excluir_vacaciones);
$function$;

DROP FUNCTION IF EXISTS public.get_indice_ausentismo(date, date, uuid[], uuid[]);