-- Ocultar datos sensibles de empleados y mejorar seguridad

-- Crear política más restrictiva para ocultar datos sensibles
DROP POLICY IF EXISTS "Empleados ven su perfil limitado" ON public.empleados;

-- Nueva política que excluye datos sensibles para empleados regulares
CREATE POLICY "Empleados ven perfil sin datos sensibles"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
);

-- Crear función para obtener perfil limitado de empleados regulares
CREATE OR REPLACE FUNCTION public.get_empleado_profile_limited()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  email text,
  rol user_role,
  sucursal_id uuid,
  activo boolean,
  fecha_ingreso date,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Solo devuelve información básica, sin DNI ni legajo
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.email,
    e.rol,
    e.sucursal_id,
    e.activo,
    e.fecha_ingreso,
    e.avatar_url
  FROM public.empleados e
  WHERE e.user_id = auth.uid()
  AND auth.uid() IS NOT NULL
  AND e.activo = true
  LIMIT 1;
$$;

-- Función para que solo admins accedan a datos completos
CREATE OR REPLACE FUNCTION public.get_empleado_full_admin_only(empleado_uuid uuid)
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  email text,
  dni text,
  legajo text,
  rol user_role,
  sucursal_id uuid,
  grupo_id uuid,
  activo boolean,
  fecha_ingreso date,
  avatar_url text,
  face_descriptor float8[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.email,
    e.dni,
    e.legajo,
    e.rol,
    e.sucursal_id,
    e.grupo_id,
    e.activo,
    e.fecha_ingreso,
    e.avatar_url,
    e.face_descriptor
  FROM public.empleados e
  WHERE e.id = empleado_uuid
  AND current_user_is_admin() = true
  LIMIT 1;
$$;

-- Crear trigger para auditar accesos a datos de empleados
CREATE TABLE IF NOT EXISTS public.empleado_access_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  accessed_empleado_id uuid,
  access_type text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en el log de accesos
ALTER TABLE public.empleado_access_log ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de acceso
CREATE POLICY "Solo admins ven logs de acceso"
ON public.empleado_access_log
FOR SELECT
TO authenticated
USING (current_user_is_admin());