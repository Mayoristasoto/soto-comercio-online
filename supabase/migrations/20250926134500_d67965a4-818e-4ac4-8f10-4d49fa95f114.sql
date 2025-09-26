-- Fix critical security vulnerability: Secure facial recognition data
-- Remove the dangerous public read policy that exposes biometric data

-- 1. Drop the insecure public read policy
DROP POLICY IF EXISTS "Public can read active face descriptors for kiosk" ON public.empleados_rostros;

-- 2. Create secure policies for facial recognition data access

-- Policy 1: Admin RRHH can manage all facial data for administrative purposes
CREATE POLICY "admin_rrhh_manage_face_data"
ON public.empleados_rostros
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Policy 2: Employees can view their own facial data only
CREATE POLICY "employees_view_own_face_data"
ON public.empleados_rostros
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

-- 3. Create a secure function for kiosk facial recognition authentication
-- This function will handle the comparison without exposing raw biometric data
CREATE OR REPLACE FUNCTION public.authenticate_face_kiosk(
  p_face_descriptor double precision[],
  p_threshold double precision DEFAULT 0.6
)
RETURNS TABLE(
  empleado_id uuid,
  nombre text,
  apellido text,
  confidence_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_record RECORD;
  distance double precision;
  best_match RECORD;
  best_distance double precision := 999999;
BEGIN
  -- Only allow this function to be called from authenticated sessions
  -- In production, you might want to restrict this further to specific service accounts
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized access to facial authentication';
  END IF;

  -- Find the best matching face from active employees
  FOR result_record IN 
    SELECT 
      er.empleado_id,
      er.face_descriptor,
      er.confidence_score,
      e.nombre,
      e.apellido,
      e.activo
    FROM empleados_rostros er
    JOIN empleados e ON e.id = er.empleado_id
    WHERE er.is_active = true 
    AND e.activo = true
  LOOP
    -- Calculate euclidean distance between descriptors
    -- This is a simplified comparison - in production use proper face comparison algorithms
    SELECT sqrt(
      (SELECT sum(power(a.val - b.val, 2)) 
       FROM unnest(p_face_descriptor) WITH ORDINALITY a(val, idx)
       JOIN unnest(result_record.face_descriptor) WITH ORDINALITY b(val, idx) 
       ON a.idx = b.idx)
    ) INTO distance;
    
    -- Track the best match
    IF distance < best_distance AND distance <= p_threshold THEN
      best_distance := distance;
      best_match := result_record;
    END IF;
  END LOOP;

  -- Return the best match if found
  IF best_match IS NOT NULL THEN
    RETURN QUERY SELECT 
      best_match.empleado_id,
      best_match.nombre,
      best_match.apellido,
      (1.0 - best_distance)::double precision as confidence_score;
  END IF;
  
  RETURN;
END;
$$;

-- 4. Grant execute permission on the authentication function to authenticated users
GRANT EXECUTE ON FUNCTION public.authenticate_face_kiosk(double precision[], double precision) TO authenticated;

-- 5. Log security change
INSERT INTO fichaje_auditoria (
  registro_id,
  tabla_afectada,
  accion,
  datos_nuevos,
  usuario_id,
  timestamp_accion
) VALUES (
  gen_random_uuid(),
  'empleados_rostros',
  'SECURITY_UPDATE',
  '{"action": "removed_public_access", "reason": "critical_security_vulnerability_fix", "new_policies": ["admin_rrhh_manage_face_data", "employees_view_own_face_data"], "secure_function": "authenticate_face_kiosk"}'::jsonb,
  NULL, -- System change
  now()
);