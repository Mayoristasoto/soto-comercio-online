-- Eliminar la vista existente y recrearla como función SECURITY DEFINER
-- para bypass de RLS en acceso público del kiosco

DROP VIEW IF EXISTS public.empleados_kiosk_minimal;

-- Crear función SECURITY DEFINER que retorna los datos mínimos de empleados
CREATE OR REPLACE FUNCTION public.get_empleados_kiosk_minimal()
RETURNS TABLE (
  id uuid,
  nombre text,
  apellido text,
  avatar_url text,
  activo boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nombre, apellido, avatar_url, activo
  FROM public.empleados
  WHERE activo = true
  ORDER BY apellido ASC;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_empleados_kiosk_minimal() TO anon;
GRANT EXECUTE ON FUNCTION public.get_empleados_kiosk_minimal() TO authenticated;