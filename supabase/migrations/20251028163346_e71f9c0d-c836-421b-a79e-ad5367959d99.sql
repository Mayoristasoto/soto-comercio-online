-- Eliminar la vista anterior con SECURITY DEFINER implícito
DROP VIEW IF EXISTS empleado_cruces_rojas_semana_actual;

-- Recrear la vista sin SECURITY DEFINER (usa SECURITY INVOKER por defecto)
CREATE VIEW empleado_cruces_rojas_semana_actual 
WITH (security_invoker = true)
AS
SELECT 
  ecr.empleado_id,
  e.nombre,
  e.apellido,
  e.avatar_url,
  COUNT(*) FILTER (WHERE ecr.anulada = FALSE) as total_cruces_rojas,
  COUNT(*) FILTER (WHERE ecr.tipo_infraccion = 'llegada_tarde' AND ecr.anulada = FALSE) as llegadas_tarde,
  COUNT(*) FILTER (WHERE ecr.tipo_infraccion = 'salida_temprana' AND ecr.anulada = FALSE) as salidas_tempranas,
  COUNT(*) FILTER (WHERE ecr.tipo_infraccion = 'pausa_excedida' AND ecr.anulada = FALSE) as pausas_excedidas,
  json_agg(
    json_build_object(
      'tipo', ecr.tipo_infraccion,
      'fecha', ecr.fecha_infraccion,
      'minutos', ecr.minutos_diferencia,
      'observaciones', ecr.observaciones
    ) ORDER BY ecr.fecha_infraccion DESC
  ) FILTER (WHERE ecr.anulada = FALSE) as detalles
FROM empleado_cruces_rojas ecr
JOIN empleados e ON e.id = ecr.empleado_id
WHERE ecr.fecha_infraccion >= DATE_TRUNC('week', CURRENT_DATE)
  AND ecr.fecha_infraccion < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY ecr.empleado_id, e.nombre, e.apellido, e.avatar_url;