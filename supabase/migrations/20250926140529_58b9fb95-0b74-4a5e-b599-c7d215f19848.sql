-- Fix security issue: Recreate empleados_basic view with SECURITY INVOKER
-- Drop the existing view and recreate it with explicit SECURITY INVOKER

DROP VIEW IF EXISTS public.empleados_basic;

CREATE VIEW public.empleados_basic
WITH (security_invoker = true)
AS SELECT 
  id,
  nombre,
  apellido,
  email,
  rol,
  sucursal_id,
  grupo_id,
  activo,
  fecha_ingreso,
  avatar_url,
  legajo,
  puesto,
  created_at,
  updated_at
FROM empleados e
WHERE activo = true;

-- Add comment to document the security change
COMMENT ON VIEW public.empleados_basic IS 'Basic employee information view with SECURITY INVOKER for proper RLS enforcement';

-- Log this security change
INSERT INTO public.fichaje_auditoria (
  registro_id, 
  tabla_afectada, 
  accion, 
  datos_nuevos, 
  usuario_id, 
  timestamp_accion
) VALUES (
  gen_random_uuid(),
  'public.empleados_basic',
  'SECURITY_UPDATE',
  '{"change": "Recreated view with SECURITY INVOKER to enforce proper RLS", "view": "empleados_basic"}'::jsonb,
  auth.uid(),
  now()
);