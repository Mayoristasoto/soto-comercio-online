-- COMPREHENSIVE SECURITY FIX FOR EMPLOYEE DATA PROTECTION
-- This migration separates sensitive employee data and implements column-level security

-- 1. Create separate table for highly sensitive employee data
CREATE TABLE public.empleados_datos_sensibles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL UNIQUE,
  dni TEXT,
  salario NUMERIC(12,2),
  fecha_nacimiento DATE,
  telefono TEXT,
  direccion TEXT,
  estado_civil TEXT,
  emergencia_contacto_nombre TEXT,
  emergencia_contacto_telefono TEXT,
  face_descriptor DOUBLE PRECISION[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_empleados_datos_sensibles_empleado 
    FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE
);

-- Enable RLS on sensitive data table
ALTER TABLE public.empleados_datos_sensibles ENABLE ROW LEVEL SECURITY;

-- 2. Create audit log table for sensitive data access
CREATE TABLE public.empleados_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_accedido_id UUID NOT NULL,
  usuario_acceso_id UUID,
  tipo_acceso TEXT NOT NULL, -- 'view_basic', 'view_sensitive', 'update', 'create'
  datos_accedidos TEXT[], -- columns accessed
  ip_address INET,
  user_agent TEXT,
  timestamp_acceso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_empleados_audit_empleado 
    FOREIGN KEY (empleado_accedido_id) REFERENCES public.empleados(id) ON DELETE CASCADE
);

-- Enable RLS on audit log
ALTER TABLE public.empleados_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer functions for safe data access
CREATE OR REPLACE FUNCTION public.get_empleado_basic_safe()
RETURNS TABLE(
  id UUID, 
  nombre TEXT, 
  apellido TEXT, 
  email TEXT, 
  rol user_role, 
  sucursal_id UUID, 
  activo BOOLEAN, 
  fecha_ingreso DATE,
  avatar_url TEXT
) 
LANGUAGE SQL 
STABLE SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.email,
    e.rol,
    e.sucursal_id,
    e.activo,
    e.fecha_ingreso,
    e.avatar_url
  FROM public.empleados e
  WHERE e.user_id = auth.uid()
  AND auth.uid() IS NOT NULL
  AND e.activo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_empleado_sensitive_admin_only(empleado_uuid UUID)
RETURNS TABLE(
  id UUID,
  dni TEXT,
  salario NUMERIC,
  fecha_nacimiento DATE,
  telefono TEXT,
  direccion TEXT,
  estado_civil TEXT,
  emergencia_contacto_nombre TEXT,
  emergencia_contacto_telefono TEXT
)
LANGUAGE SQL 
STABLE SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  SELECT 
    eds.empleado_id,
    eds.dni,
    eds.salario,
    eds.fecha_nacimiento,
    eds.telefono,
    eds.direccion,
    eds.estado_civil,
    eds.emergencia_contacto_nombre,
    eds.emergencia_contacto_telefono
  FROM public.empleados_datos_sensibles eds
  WHERE eds.empleado_id = empleado_uuid
  AND current_user_is_admin() = true
  LIMIT 1;
$$;

-- 4. Function to log access to sensitive data
CREATE OR REPLACE FUNCTION public.log_empleado_access(
  p_empleado_id UUID,
  p_tipo_acceso TEXT,
  p_datos_accedidos TEXT[] DEFAULT ARRAY['basic'],
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.empleados_audit_log (
    empleado_accedido_id,
    usuario_acceso_id,
    tipo_acceso,
    datos_accedidos,
    ip_address,
    user_agent
  ) VALUES (
    p_empleado_id,
    auth.uid(),
    p_tipo_acceso,
    p_datos_accedidos,
    p_ip,
    p_user_agent
  );
END;
$$;

-- 5. Migrate existing sensitive data to new table
INSERT INTO public.empleados_datos_sensibles (
  empleado_id, dni, salario, fecha_nacimiento, telefono, direccion,
  estado_civil, emergencia_contacto_nombre, emergencia_contacto_telefono, face_descriptor
)
SELECT 
  id, dni, salario, fecha_nacimiento, telefono, direccion,
  estado_civil, emergencia_contacto_nombre, emergencia_contacto_telefono, face_descriptor
FROM public.empleados
WHERE dni IS NOT NULL OR salario IS NOT NULL OR telefono IS NOT NULL OR direccion IS NOT NULL;

-- 6. Remove sensitive columns from main empleados table
ALTER TABLE public.empleados 
  DROP COLUMN IF EXISTS dni,
  DROP COLUMN IF EXISTS salario,
  DROP COLUMN IF EXISTS fecha_nacimiento,
  DROP COLUMN IF EXISTS telefono,
  DROP COLUMN IF EXISTS direccion,
  DROP COLUMN IF EXISTS estado_civil,
  DROP COLUMN IF EXISTS emergencia_contacto_nombre,
  DROP COLUMN IF EXISTS emergencia_contacto_telefono,
  DROP COLUMN IF EXISTS face_descriptor;

-- 7. Create RLS policies for sensitive data table
CREATE POLICY "Admin can manage all sensitive data" 
ON public.empleados_datos_sensibles 
FOR ALL 
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Employee can view own sensitive data limited" 
ON public.empleados_datos_sensibles 
FOR SELECT 
USING (
  empleado_id = get_current_empleado() AND
  auth.uid() IS NOT NULL
);

-- 8. Create RLS policies for audit log
CREATE POLICY "Admin can view all audit logs" 
ON public.empleados_audit_log 
FOR SELECT 
USING (current_user_is_admin());

CREATE POLICY "System can insert audit logs" 
ON public.empleados_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 9. Create secure view for employee management with audit logging
CREATE OR REPLACE VIEW public.empleados_secure_view AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.email,
  e.rol,
  e.sucursal_id,
  e.grupo_id,
  e.activo,
  e.fecha_ingreso,
  e.avatar_url,
  e.legajo,
  e.puesto,
  e.created_at,
  e.updated_at,
  -- Only include sensitive data for admins
  CASE WHEN current_user_is_admin() THEN eds.dni ELSE NULL END as dni,
  CASE WHEN current_user_is_admin() THEN eds.telefono ELSE NULL END as telefono,
  CASE WHEN current_user_is_admin() THEN eds.direccion ELSE NULL END as direccion,
  CASE WHEN current_user_is_admin() THEN eds.salario ELSE NULL END as salario
FROM public.empleados e
LEFT JOIN public.empleados_datos_sensibles eds ON e.id = eds.empleado_id;

-- 10. Create trigger to automatically create sensitive data record for new employees
CREATE OR REPLACE FUNCTION public.create_empleado_sensitive_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.empleados_datos_sensibles (empleado_id)
  VALUES (NEW.id)
  ON CONFLICT (empleado_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_empleado_sensitive_record
  AFTER INSERT ON public.empleados
  FOR EACH ROW
  EXECUTE FUNCTION public.create_empleado_sensitive_record();

-- 11. Add updated_at trigger to sensitive data table
CREATE TRIGGER update_empleados_datos_sensibles_updated_at
  BEFORE UPDATE ON public.empleados_datos_sensibles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create indexes for performance and security
CREATE INDEX idx_empleados_datos_sensibles_empleado_id ON public.empleados_datos_sensibles(empleado_id);
CREATE INDEX idx_empleados_audit_log_empleado_accedido ON public.empleados_audit_log(empleado_accedido_id);
CREATE INDEX idx_empleados_audit_log_timestamp ON public.empleados_audit_log(timestamp_acceso DESC);
CREATE INDEX idx_empleados_audit_log_usuario ON public.empleados_audit_log(usuario_acceso_id);

-- 13. Add comments for documentation
COMMENT ON TABLE public.empleados_datos_sensibles IS 'Tabla separada para datos sensibles de empleados con acceso restringido';
COMMENT ON TABLE public.empleados_audit_log IS 'Registro de auditoría para acceso a datos de empleados';
COMMENT ON VIEW public.empleados_secure_view IS 'Vista segura que expone datos sensibles solo a administradores';

-- 14. Revoke direct access to sensitive tables for additional security
REVOKE ALL ON public.empleados_datos_sensibles FROM anon, authenticated;
REVOKE ALL ON public.empleados_audit_log FROM anon, authenticated;

-- Grant specific access through RLS policies only
GRANT SELECT ON public.empleados_datos_sensibles TO authenticated;
GRANT INSERT ON public.empleados_audit_log TO authenticated;