-- Create policy to allow kiosk (anonymous) to insert fichajes
-- This allows the kiosk terminal to register check-ins without authentication
CREATE POLICY "Kiosk can insert fichajes" 
ON public.fichajes 
FOR INSERT 
TO anon
WITH CHECK (
  -- Only allow entrada type for kiosco
  tipo = 'entrada' AND
  -- Only allow facial method for kiosco  
  metodo = 'facial' AND
  -- Ensure empleado_id is valid (exists in empleados table)
  empleado_id IN (SELECT id FROM public.empleados WHERE activo = true)
);

-- Also allow authenticated users (for regular employee access)
CREATE POLICY "Authenticated users can insert their own fichajes" 
ON public.fichajes 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Either it's their own fichaje or they're admin
  empleado_id = get_current_empleado() OR
  EXISTS (
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh' 
    AND activo = true
  )
);