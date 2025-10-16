-- Fix infinite recursion in empleados RLS policies
-- The issue: policies were querying empleados table directly, causing recursion
-- Solution: use security definer functions that check user_roles table instead

-- Drop problematic policies that query empleados directly
DROP POLICY IF EXISTS "admins_view_all_basic_data" ON public.empleados;
DROP POLICY IF EXISTS "managers_view_branch_basic_data" ON public.empleados;
DROP POLICY IF EXISTS "admin_or_manager_insert_empleados" ON public.empleados;
DROP POLICY IF EXISTS "admin_or_manager_select_empleados" ON public.empleados;
DROP POLICY IF EXISTS "empleados_access_policy" ON public.empleados;
DROP POLICY IF EXISTS "employees_view_own_basic_data" ON public.empleados;

-- Create helper function to check if user is manager of a specific branch
CREATE OR REPLACE FUNCTION public.is_manager_of_branch(branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'gerente_sucursal') 
  AND EXISTS (
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND sucursal_id = branch_id
    AND activo = true
  );
$$;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "Admins can view all employees"
ON public.empleados
FOR SELECT
USING (current_user_is_admin());

CREATE POLICY "Employees can view own data"
ON public.empleados
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Managers can view branch employees"
ON public.empleados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.empleados self
    WHERE self.user_id = auth.uid()
    AND self.rol = 'gerente_sucursal'
    AND self.activo = true
    AND self.sucursal_id = empleados.sucursal_id
  )
);

CREATE POLICY "Admins can insert employees"
ON public.empleados
FOR INSERT
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can update employees"
ON public.empleados
FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete employees"
ON public.empleados
FOR DELETE
USING (current_user_is_admin());

CREATE POLICY "Employees can update own basic data"
ON public.empleados
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());