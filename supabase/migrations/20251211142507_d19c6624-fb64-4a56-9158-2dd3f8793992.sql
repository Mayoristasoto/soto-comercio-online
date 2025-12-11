-- Fix: Recreate view with SECURITY INVOKER to use the querying user's permissions
DROP VIEW IF EXISTS public.empleados_kiosk_minimal;

CREATE VIEW public.empleados_kiosk_minimal 
WITH (security_invoker = true) AS
SELECT 
  id, 
  nombre, 
  apellido, 
  avatar_url, 
  activo
FROM public.empleados 
WHERE activo = true;

COMMENT ON VIEW public.empleados_kiosk_minimal IS 'Minimal employee view for kiosk facial recognition. Contains only essential fields for display after authentication. Do NOT add sensitive fields like email, DNI, legajo, or puesto.';

GRANT SELECT ON public.empleados_kiosk_minimal TO authenticated;