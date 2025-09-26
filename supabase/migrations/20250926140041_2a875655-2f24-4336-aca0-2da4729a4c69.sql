-- Fix security issue: Restrict access to empleados_audit_log table to administrators only
-- Drop any existing public policies that might expose audit data
DROP POLICY IF EXISTS "Public can view audit logs" ON public.empleados_audit_log;
DROP POLICY IF EXISTS "Anyone can view audit logs" ON public.empleados_audit_log;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.empleados_audit_log;

-- Enable RLS if not already enabled
ALTER TABLE public.empleados_audit_log ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policy: Only admin_rrhh can manage audit logs
CREATE POLICY "Admin RRHH can manage audit logs" 
ON public.empleados_audit_log 
FOR ALL 
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

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
  'empleados_audit_log',
  'SECURITY_UPDATE',
  '{"change": "Restricted access to admin_rrhh only", "policies": ["Admin RRHH can manage audit logs"]}'::jsonb,
  auth.uid(),
  now()
);