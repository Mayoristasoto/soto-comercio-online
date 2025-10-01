-- Drop the problematic policies
DROP POLICY IF EXISTS "Admin roles can insert sensitive employee data" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "Admin roles can view sensitive employee data" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "Admin roles can update sensitive employee data" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "Employees can view their own sensitive data" ON public.empleados_datos_sensibles;

-- Create security definer function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol IN ('admin_rrhh', 'gerente_sucursal')
    AND activo = true
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Admin and managers can insert sensitive data"
ON public.empleados_datos_sensibles
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admin and managers can view sensitive data"
ON public.empleados_datos_sensibles
FOR SELECT
TO authenticated
USING (is_admin_or_manager() OR empleado_id = get_current_empleado());

CREATE POLICY "Admin and managers can update sensitive data"
ON public.empleados_datos_sensibles
FOR UPDATE
TO authenticated
USING (is_admin_or_manager())
WITH CHECK (is_admin_or_manager());