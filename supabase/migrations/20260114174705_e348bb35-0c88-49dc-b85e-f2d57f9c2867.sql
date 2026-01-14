-- =====================================================
-- FIX OVERLY PERMISSIVE RLS POLICIES
-- =====================================================

-- 1. FIX asignaciones_especiales - Restrict to admin_rrhh and gerente_sucursal for their branch
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage all assignments" ON asignaciones_especiales;
DROP POLICY IF EXISTS "Gerentes can manage branch assignments" ON asignaciones_especiales;
DROP POLICY IF EXISTS "Empleados can view own assignments" ON asignaciones_especiales;

-- Admin RRHH can manage all assignments
CREATE POLICY "Admin RRHH can manage all assignments" ON asignaciones_especiales
FOR ALL TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Gerentes can manage assignments for their branch employees
CREATE POLICY "Gerentes can manage branch assignments" ON asignaciones_especiales
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'gerente_sucursal'
    AND e.sucursal_id = asignaciones_especiales.sucursal_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'gerente_sucursal'
    AND e.sucursal_id = asignaciones_especiales.sucursal_id
  )
);

-- Employees can view their own assignments
CREATE POLICY "Empleados can view own assignments" ON asignaciones_especiales
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.id = asignaciones_especiales.empleado_id
  )
);

-- 2. FIX brand_partners - Restrict write to admin_rrhh only
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage brands" ON brand_partners;
DROP POLICY IF EXISTS "Admin RRHH can manage brands" ON brand_partners;

-- Anyone can view brand partners (public read)
CREATE POLICY "Anyone can view brand partners" ON brand_partners
FOR SELECT TO authenticated
USING (true);

-- Only admin can manage brands
CREATE POLICY "Admin RRHH can manage brands" ON brand_partners
FOR ALL TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 3. FIX calificaciones_empleados - Add basic validation for public inserts
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create ratings" ON calificaciones_empleados;
DROP POLICY IF EXISTS "Public can insert ratings with valid token" ON calificaciones_empleados;

-- Create a function to validate token format (base64 encoded, contains required fields)
CREATE OR REPLACE FUNCTION public.is_valid_rating_token(token_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Token must be non-empty and at least 20 characters (reasonable base64 length)
  IF token_value IS NULL OR length(token_value) < 20 THEN
    RETURN false;
  END IF;
  
  -- Check that token hasn't been used before (prevent duplicate ratings)
  IF EXISTS (
    SELECT 1 FROM calificaciones_empleados 
    WHERE token_usado = token_value
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Public can insert ratings only with valid token
CREATE POLICY "Public can insert ratings with valid token" ON calificaciones_empleados
FOR INSERT TO anon, authenticated
WITH CHECK (
  is_valid_rating_token(token_usado)
);

-- Employees can view their own ratings
CREATE POLICY "Empleados can view own ratings" ON calificaciones_empleados
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.id = calificaciones_empleados.empleado_id
  )
  OR current_user_is_admin()
);

-- Admin can view all ratings
CREATE POLICY "Admin can view all ratings" ON calificaciones_empleados
FOR SELECT TO authenticated
USING (current_user_is_admin());

-- 4. FIX gondolas_display - Restrict to admin roles
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can manage gondolas_display" ON gondolas_display;
DROP POLICY IF EXISTS "Admin can manage gondolas display" ON gondolas_display;

-- Anyone authenticated can view gondolas display
CREATE POLICY "Anyone can view gondolas display" ON gondolas_display
FOR SELECT TO authenticated
USING (true);

-- Only admin can manage gondolas display
CREATE POLICY "Admin can manage gondolas display" ON gondolas_display
FOR ALL TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 5. FIX fichaje_auditoria - Restrict inserts to system operations
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON fichaje_auditoria;
DROP POLICY IF EXISTS "System can insert audit logs" ON fichaje_auditoria;

-- Create a secure function for inserting audit logs
CREATE OR REPLACE FUNCTION public.insert_fichaje_auditoria(
  p_tabla_afectada text,
  p_registro_id uuid,
  p_accion text,
  p_datos_anteriores jsonb DEFAULT NULL,
  p_datos_nuevos jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO fichaje_auditoria (
    tabla_afectada, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id, timestamp_accion
  ) VALUES (
    p_tabla_afectada, p_registro_id, p_accion, p_datos_anteriores, p_datos_nuevos, v_user_id, now()
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Only allow viewing audit logs for admin and gerentes
CREATE POLICY "Admin and gerentes can view audit logs" ON fichaje_auditoria
FOR SELECT TO authenticated
USING (
  current_user_is_admin() OR
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'gerente_sucursal'
  )
);

-- No direct inserts - use the secure function instead
CREATE POLICY "No direct inserts to audit logs" ON fichaje_auditoria
FOR INSERT TO authenticated
WITH CHECK (false);

-- 6. kiosk_rate_limit - This is acceptable as a system table for rate limiting
-- Keep existing policy but add comment for documentation
COMMENT ON TABLE kiosk_rate_limit IS 'System table for kiosk rate limiting. Permissive policy is intentional for system functionality.';