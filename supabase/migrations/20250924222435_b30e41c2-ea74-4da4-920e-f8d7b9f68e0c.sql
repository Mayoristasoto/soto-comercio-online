-- Fix RLS policy for fichajes table to allow admin users to insert manual records

-- First, let's update the existing policy or create a new one for manual fichaje creation
DROP POLICY IF EXISTS "admin_can_manage_fichajes" ON public.fichajes;

CREATE POLICY "admin_can_manage_fichajes" 
ON public.fichajes 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
  )
);

-- Also ensure empleados can view/insert their own fichajes
DROP POLICY IF EXISTS "empleados_can_manage_own_fichajes" ON public.fichajes;

CREATE POLICY "empleados_can_manage_own_fichajes" 
ON public.fichajes 
FOR ALL 
TO authenticated 
USING (
  empleado_id IN (
    SELECT id FROM public.empleados 
    WHERE user_id = auth.uid()
  )
);

-- Allow empleados to insert their own fichajes
DROP POLICY IF EXISTS "empleados_can_insert_own_fichajes" ON public.fichajes;

CREATE POLICY "empleados_can_insert_own_fichajes" 
ON public.fichajes 
FOR INSERT 
TO authenticated 
WITH CHECK (
  empleado_id IN (
    SELECT id FROM public.empleados 
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
  )
);