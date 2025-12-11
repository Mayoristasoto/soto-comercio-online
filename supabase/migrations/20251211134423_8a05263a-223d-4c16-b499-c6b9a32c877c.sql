-- Remove dangerous policy that exposes employee data to unauthenticated users
DROP POLICY IF EXISTS "Kiosco puede ver datos básicos de empleados activos" ON public.empleados;

-- Create a minimal view for kiosk functionality with only essential fields
CREATE OR REPLACE VIEW public.empleados_kiosk_minimal AS
SELECT 
  id, 
  nombre, 
  apellido, 
  avatar_url, 
  activo
FROM public.empleados 
WHERE activo = true;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.empleados_kiosk_minimal IS 'Minimal employee view for kiosk facial recognition. Contains only essential fields for display after authentication. Do NOT add sensitive fields like email, DNI, legajo, or puesto.';

-- Grant SELECT only to authenticated users (not public/anon)
GRANT SELECT ON public.empleados_kiosk_minimal TO authenticated;