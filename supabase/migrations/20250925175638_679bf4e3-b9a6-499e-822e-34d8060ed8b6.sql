-- Fix infinite recursion in empleados table RLS policies
-- The issue is that the policies are calling functions that query empleados table again

-- First, drop all existing policies on empleados table
DROP POLICY IF EXISTS "Admins can manage all employees" ON empleados;
DROP POLICY IF EXISTS "Empleados ven su perfil limitado" ON empleados;
DROP POLICY IF EXISTS "Employees can view own profile" ON empleados;

-- Create simplified policies without recursive calls
-- Policy for employees to view their own profile
CREATE POLICY "employees_own_profile" 
ON empleados 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy for admin users to manage all employees
-- Use direct role check without calling functions that query empleados table
CREATE POLICY "admin_manage_employees" 
ON empleados 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'::user_role 
    AND e.activo = true
    AND e.id != empleados.id  -- Prevent self-reference
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'::user_role 
    AND e.activo = true
    AND e.id != empleados.id  -- Prevent self-reference
  )
);

-- Allow initial employee creation during signup
CREATE POLICY "allow_initial_employee_creation" 
ON empleados 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());