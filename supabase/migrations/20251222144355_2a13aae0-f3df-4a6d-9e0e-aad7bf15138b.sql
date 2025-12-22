-- Primero eliminar la función existente y recrearla con tipos correctos
DROP FUNCTION IF EXISTS public.kiosk_buscar_empleado(TEXT);

CREATE FUNCTION public.kiosk_buscar_empleado(p_termino TEXT)
RETURNS TABLE(
  id UUID,
  nombre TEXT,
  apellido TEXT,
  legajo TEXT,
  avatar_url TEXT,
  sucursal_nombre TEXT,
  tiene_pin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.legajo,
    e.avatar_url,
    s.nombre AS sucursal_nombre,
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
  ORDER BY e.apellido, e.nombre
  LIMIT 10;
END;
$$;