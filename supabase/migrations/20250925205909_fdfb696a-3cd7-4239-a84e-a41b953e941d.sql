-- Create a public function to get basic employee data for kiosk recognition
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

-- Allow public access to this function
GRANT EXECUTE ON FUNCTION public.get_employees_for_kiosk() TO anon, authenticated;