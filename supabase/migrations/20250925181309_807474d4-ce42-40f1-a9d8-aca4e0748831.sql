-- Eliminar las políticas problemáticas
DROP POLICY IF EXISTS "admin_rrhh_can_view_all_employees" ON empleados;
DROP POLICY IF EXISTS "admin_rrhh_can_update_employees" ON empleados;
DROP POLICY IF EXISTS "admin_rrhh_can_insert_employees" ON empleados;

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

-- Crear políticas simplificadas usando la función
CREATE POLICY "admin_can_view_all_employees" 
ON empleados 
FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'admin_rrhh' OR 
  user_id = auth.uid()
);

CREATE POLICY "admin_can_manage_employees" 
ON empleados 
FOR ALL
TO authenticated
USING (public.current_user_role() = 'admin_rrhh')
WITH CHECK (public.current_user_role() = 'admin_rrhh');