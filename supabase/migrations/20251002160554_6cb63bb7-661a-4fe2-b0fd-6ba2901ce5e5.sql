-- Recreate policies for empleados with admin_or_manager access
DROP POLICY IF EXISTS admin_or_manager_insert_empleados ON public.empleados;
DROP POLICY IF EXISTS admin_or_manager_select_empleados ON public.empleados;

CREATE POLICY admin_or_manager_insert_empleados
ON public.empleados
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY admin_or_manager_select_empleados
ON public.empleados
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager() OR user_id = auth.uid());