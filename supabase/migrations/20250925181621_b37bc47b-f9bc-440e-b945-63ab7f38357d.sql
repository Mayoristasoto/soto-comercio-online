-- Eliminar TODAS las políticas existentes en empleados
DROP POLICY IF EXISTS "employees_own_profile_only" ON empleados;
DROP POLICY IF EXISTS "admin_can_view_all_employees" ON empleados;
DROP POLICY IF EXISTS "admin_can_manage_employees" ON empleados;

-- Crear una función segura que evite la recursión
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.empleados WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Crear política única y simple
CREATE POLICY "empleados_access_policy" 
ON empleados 
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.current_user_role() = 'admin_rrhh'
)
WITH CHECK (
  user_id = auth.uid() OR 
  public.current_user_role() = 'admin_rrhh'
);