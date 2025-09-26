-- Eliminar políticas existentes que pueden estar causando problemas
DROP POLICY IF EXISTS "Admin can manage all sensitive data" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "Admins can manage sensitive employee data" ON public.empleados_datos_sensibles;

-- Crear función security definer para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh' 
    AND activo = true
  );
$$;

-- Crear políticas mejoradas para empleados_datos_sensibles
CREATE POLICY "Admin RRHH can manage all sensitive data"
ON public.empleados_datos_sensibles
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Política para que empleados vean solo sus datos sensibles básicos
CREATE POLICY "Employees can view own basic sensitive data"
ON public.empleados_datos_sensibles
FOR SELECT
USING (
  empleado_id = get_current_empleado() 
  AND auth.uid() IS NOT NULL
);