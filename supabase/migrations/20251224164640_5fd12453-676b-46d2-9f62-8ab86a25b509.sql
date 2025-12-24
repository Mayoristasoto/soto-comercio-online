-- Fix ambiguous column reference in kiosk_buscar_empleado function
CREATE OR REPLACE FUNCTION public.kiosk_buscar_empleado(p_termino text)
 RETURNS TABLE(id uuid, nombre text, apellido text, legajo text, avatar_url text, sucursal_nombre text, tiene_pin boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre::text,
    e.apellido::text,
    e.legajo::text,
    e.avatar_url::text,
    s.nombre::text AS sucursal_nombre,
    EXISTS(SELECT 1 FROM empleados_pin ep WHERE ep.empleado_id = e.id AND ep.activo = true) AS tiene_pin
  FROM empleados e
  LEFT JOIN sucursales s ON e.sucursal_id = s.id
  WHERE e.activo = true
    AND (
      e.nombre ILIKE '%' || p_termino || '%'
      OR e.apellido ILIKE '%' || p_termino || '%'
      OR e.legajo ILIKE '%' || p_termino || '%'
      OR CONCAT(e.nombre, ' ', e.apellido) ILIKE '%' || p_termino || '%'
    )
  ORDER BY e.apellido ASC, e.nombre ASC
  LIMIT 10;
END;
$function$;