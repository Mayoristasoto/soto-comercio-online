-- Grant permissions for empleados_rostros to anon/authenticated roles
-- This allows the kiosk function to access face descriptors
CREATE POLICY "Public can read active face descriptors for kiosk" 
ON public.empleados_rostros 
FOR SELECT 
USING (is_active = true);

-- Update the kiosk function to ensure it works with the current session
CREATE OR REPLACE FUNCTION public.get_employees_for_kiosk()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.nombre, e.apellido, e.email
  FROM public.empleados e
  WHERE e.activo = true;
$$;