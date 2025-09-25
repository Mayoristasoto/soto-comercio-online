-- Fix the order: drop policies first, then function
DROP POLICY IF EXISTS "admin_manage_employees" ON empleados;
DROP POLICY IF EXISTS "employees_own_profile" ON empleados;
DROP POLICY IF EXISTS "allow_initial_employee_creation" ON empleados;

-- Now drop the function
DROP FUNCTION IF EXISTS public.current_user_is_admin();

-- Create a simple policy that only allows users to view/edit their own record
CREATE POLICY "employees_own_profile_only" 
ON empleados 
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());