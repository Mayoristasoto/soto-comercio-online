-- Crear función RPC pública para obtener datos básicos de empleado
-- Esta función es segura para uso público ya que solo devuelve información no sensible
CREATE OR REPLACE FUNCTION public.get_empleado_for_rating(empleado_uuid UUID)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  apellido TEXT,
  avatar_url TEXT,
  puesto TEXT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.avatar_url,
    e.puesto
  FROM empleados e
  WHERE e.id = empleado_uuid
    AND e.activo = true
  LIMIT 1;
$$;