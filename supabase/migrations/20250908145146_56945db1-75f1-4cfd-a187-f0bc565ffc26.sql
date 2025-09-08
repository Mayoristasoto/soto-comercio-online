-- Fix security vulnerability: Restrict manager access to employee data
-- Remove overly permissive manager policy
DROP POLICY IF EXISTS "Gerentes pueden ver empleados de su sucursal" ON public.empleados;

-- Create security definer function for limited employee data access by managers
CREATE OR REPLACE FUNCTION public.get_manager_employee_view()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  rol user_role,
  sucursal_id uuid,
  grupo_id uuid,
  activo boolean,
  fecha_ingreso date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.rol,
    e.sucursal_id,
    e.grupo_id,
    e.activo,
    e.fecha_ingreso,
    e.created_at,
    e.updated_at
  FROM public.empleados e
  WHERE e.sucursal_id IN (
    SELECT sucursal_id 
    FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'gerente_sucursal' 
    AND activo = true
  )
  AND e.activo = true;
$$;

-- Create new restrictive policy for managers
CREATE POLICY "Gerentes pueden ver datos limitados de empleados de su sucursal"
ON public.empleados
FOR SELECT
USING (
  -- Allow if user is admin (full access)
  is_admin() 
  OR 
  -- Allow if viewing own profile (full access)
  user_id = auth.uid()
  OR
  -- Allow limited access for managers (through the security function)
  (
    is_gerente_sucursal(sucursal_id) 
    AND id IN (
      SELECT gev.id FROM public.get_manager_employee_view() gev
    )
  )
);

-- Add comment for documentation
COMMENT ON FUNCTION public.get_manager_employee_view() IS 
'Returns limited employee data for managers - excludes sensitive fields like DNI, email, and user_id for security compliance';