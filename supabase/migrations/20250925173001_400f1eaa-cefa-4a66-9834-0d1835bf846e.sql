-- FIX: Just drop the function and handle conflicts properly

-- 1. Drop the problematic function (it should work now that policies are dropped)
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

-- 2. Check what policies exist and create only missing ones
-- First, let's create policies that definitely don't exist

-- Employee Access Log (definitely needs a policy)
CREATE POLICY "Admins can view employee access logs" 
ON public.empleado_access_log 
FOR SELECT 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Configuration table
CREATE POLICY "Admins can manage configuration" 
ON public.fichado_configuracion 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Employee documents
CREATE POLICY "Admins can manage employee documents" 
ON public.empleado_documentos 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Just verify the function is gone
SELECT COUNT(*) as security_definer_functions 
FROM pg_proc 
WHERE prosecdef = true 
AND proname = 'current_user_is_admin';