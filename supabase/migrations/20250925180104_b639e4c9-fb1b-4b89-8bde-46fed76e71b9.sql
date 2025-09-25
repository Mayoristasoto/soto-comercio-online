-- Fix infinite recursion by creating a security definer function
-- This function will check admin status without triggering RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_manage_employees" ON empleados;
DROP POLICY IF EXISTS "employees_own_profile" ON empleados;
DROP POLICY IF EXISTS "allow_initial_employee_creation" ON empleados;

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh'::user_role 
    AND activo = true
  );
$$;

-- Create simple policies using the security definer function
-- Policy for employees to view their own profile
CREATE POLICY "employees_own_profile" 
ON empleados 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy for admin users to manage all employees (using security definer function)
CREATE POLICY "admin_manage_employees" 
ON empleados 
FOR ALL 
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Allow initial employee creation during signup
CREATE POLICY "allow_initial_employee_creation" 
ON empleados 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());