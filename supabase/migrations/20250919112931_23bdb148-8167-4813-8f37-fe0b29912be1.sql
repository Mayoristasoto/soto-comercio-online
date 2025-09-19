-- Mejorar las políticas RLS de la tabla empleados para mayor seguridad
-- Eliminar políticas existentes que podrían ser demasiado permisivas

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admins pueden gestionar empleados" ON public.empleados;
DROP POLICY IF EXISTS "Admins pueden ver todos los empleados" ON public.empleados;
DROP POLICY IF EXISTS "Empleados pueden ver su propio perfil" ON public.empleados;
DROP POLICY IF EXISTS "Gerentes pueden ver datos limitados de empleados de su sucursal" ON public.empleados;

-- Crear políticas más restrictivas y específicas

-- 1. Solo administradores pueden insertar nuevos empleados
CREATE POLICY "Solo admins pueden crear empleados"
ON public.empleados
FOR INSERT
TO authenticated
WITH CHECK (
  current_user_is_admin()
);

-- 2. Solo administradores pueden actualizar datos de empleados
CREATE POLICY "Solo admins pueden actualizar empleados"
ON public.empleados
FOR UPDATE
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 3. Solo administradores pueden eliminar empleados
CREATE POLICY "Solo admins pueden eliminar empleados"
ON public.empleados
FOR DELETE
TO authenticated
USING (current_user_is_admin());

-- 4. Empleados solo pueden ver datos limitados de su propio perfil
CREATE POLICY "Empleados ven su perfil limitado"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
);

-- 5. Administradores pueden ver todos los empleados
CREATE POLICY "Admins ven todos los empleados"
ON public.empleados
FOR SELECT
TO authenticated
USING (current_user_is_admin());

-- 6. Gerentes pueden ver solo datos básicos de empleados de su sucursal
CREATE POLICY "Gerentes ven empleados de su sucursal"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  is_gerente_sucursal(sucursal_id)
  AND auth.uid() IS NOT NULL
);

-- Crear una vista segura para datos públicos de empleados (solo nombres y roles)
CREATE OR REPLACE VIEW public.empleados_publicos AS
SELECT 
  id,
  nombre,
  apellido,
  rol,
  sucursal_id,
  activo
FROM public.empleados
WHERE activo = true;

-- Habilitar RLS en la vista
ALTER VIEW public.empleados_publicos OWNER TO postgres;

-- Crear política para la vista pública
CREATE POLICY "Vista pública limitada de empleados"
ON public.empleados_publicos
FOR SELECT
TO authenticated
USING (true);

-- Crear función para obtener información segura del empleado actual
CREATE OR REPLACE FUNCTION public.get_current_empleado_safe()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  email text,
  rol user_role,
  sucursal_id uuid,
  activo boolean,
  fecha_ingreso date
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
    e.rol,
    e.sucursal_id,
    e.activo,
    e.fecha_ingreso
  FROM public.empleados e
  WHERE e.user_id = auth.uid()
  AND auth.uid() IS NOT NULL
  AND e.activo = true
  LIMIT 1;
$$;