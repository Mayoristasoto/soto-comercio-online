-- CRITICAL SECURITY FIX: Separate user roles from profile data
-- This prevents privilege escalation attacks by isolating authorization data

-- 1. Create isolated user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = _role 
    AND is_active = true
  )
$$;

-- 3. Migrate existing roles from empleados to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at, is_active)
SELECT 
  user_id, 
  rol, 
  created_at,
  activo
FROM public.empleados 
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Create RLS policies for user_roles table
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Update existing role check functions to use user_roles table
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin_rrhh');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin_rrhh');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin_rrhh') OR has_role(auth.uid(), 'gerente_sucursal');
$$;

CREATE OR REPLACE FUNCTION public.is_gerente_sucursal(sucursal_uuid uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'gerente_sucursal') AND
    (sucursal_uuid IS NULL OR EXISTS (
      SELECT 1 FROM empleados 
      WHERE user_id = auth.uid() 
      AND sucursal_id = sucursal_uuid
      AND activo = true
    ));
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND is_active = true
  ORDER BY 
    CASE role
      WHEN 'admin_rrhh' THEN 1
      WHEN 'gerente_sucursal' THEN 2
      WHEN 'lider_grupo' THEN 3
      ELSE 4
    END
  LIMIT 1;
$$;

-- 6. Create trigger to keep empleados.rol in sync (backward compatibility)
CREATE OR REPLACE FUNCTION sync_empleado_rol_from_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE empleados
    SET rol = NEW.role
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_rol_on_user_roles_change
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION sync_empleado_rol_from_user_roles();

-- 7. Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role user_role,
  new_role user_role NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role audit log"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin_rrhh'));

-- 8. Fix kiosk authentication security issues
-- Add kiosk device whitelist
CREATE TABLE IF NOT EXISTS public.kiosk_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_token TEXT UNIQUE NOT NULL,
  allowed_ips INET[] NOT NULL DEFAULT '{}',
  sucursal_id UUID REFERENCES public.sucursales(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.kiosk_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage kiosk devices"
ON public.kiosk_devices
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (has_role(auth.uid(), 'admin_rrhh'));

-- Add kiosk rate limiting table
CREATE TABLE IF NOT EXISTS public.kiosk_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL,
  last_fichaje TIMESTAMPTZ NOT NULL DEFAULT now(),
  fichaje_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kiosk_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System manages rate limits"
ON public.kiosk_rate_limit
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Updated kiosk_insert_fichaje with security improvements
CREATE OR REPLACE FUNCTION public.kiosk_insert_fichaje_secure(
  p_empleado_id uuid,
  p_confianza numeric,
  p_device_token text DEFAULT NULL,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_datos jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  fichaje_tipo fichaje_tipo;
  ultimo_tipo fichaje_tipo;
  v_device_valid boolean := false;
  v_rate_record RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Validate device token if provided
  IF p_device_token IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM kiosk_devices
      WHERE device_token = p_device_token
      AND is_active = true
      AND (allowed_ips = '{}' OR inet_client_addr() = ANY(allowed_ips))
    ) INTO v_device_valid;
    
    IF NOT v_device_valid THEN
      RAISE EXCEPTION 'Invalid or unauthorized kiosk device';
    END IF;
    
    -- Update last used timestamp
    UPDATE kiosk_devices
    SET last_used_at = v_now
    WHERE device_token = p_device_token;
  ELSE
    RAISE EXCEPTION 'Device token required for kiosk operations';
  END IF;

  -- 2. Validate confidence score (must be from server-side facial auth)
  IF p_confianza IS NULL OR p_confianza < 0.6 THEN
    RAISE EXCEPTION 'Insufficient facial recognition confidence';
  END IF;

  -- 3. Rate limiting: max 10 fichajes per hour per employee
  SELECT * INTO v_rate_record
  FROM kiosk_rate_limit
  WHERE empleado_id = p_empleado_id
  AND window_start > v_now - INTERVAL '1 hour';
  
  IF FOUND THEN
    IF v_rate_record.fichaje_count >= 10 THEN
      RAISE EXCEPTION 'Rate limit exceeded: max 10 fichajes per hour';
    END IF;
    
    UPDATE kiosk_rate_limit
    SET fichaje_count = fichaje_count + 1,
        last_fichaje = v_now
    WHERE id = v_rate_record.id;
  ELSE
    INSERT INTO kiosk_rate_limit (empleado_id, fichaje_count, window_start)
    VALUES (p_empleado_id, 1, v_now);
  END IF;

  -- 4. Validate timestamp (must be within ±5 minutes of server time)
  IF p_datos ? 'timestamp_client' THEN
    DECLARE
      v_client_timestamp TIMESTAMPTZ := (p_datos->>'timestamp_client')::TIMESTAMPTZ;
      v_time_diff INTERVAL := v_now - v_client_timestamp;
    BEGIN
      IF ABS(EXTRACT(EPOCH FROM v_time_diff)) > 300 THEN -- 5 minutes
        RAISE EXCEPTION 'Client timestamp too far from server time';
      END IF;
    END;
  END IF;

  -- 5. Get last fichaje type
  SELECT tipo INTO ultimo_tipo
  FROM public.fichajes
  WHERE empleado_id = p_empleado_id 
  AND DATE(timestamp_real) = CURRENT_DATE
  AND estado = 'valido'
  ORDER BY timestamp_real DESC
  LIMIT 1;

  -- 6. Determine fichaje type
  IF p_datos ? 'tipo' THEN
    fichaje_tipo := (p_datos->>'tipo')::fichaje_tipo;
  ELSE
    IF ultimo_tipo IS NULL THEN
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'entrada' THEN
      fichaje_tipo := 'salida';
    ELSIF ultimo_tipo = 'salida' THEN
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'pausa_inicio' THEN
      fichaje_tipo := 'pausa_fin';
    ELSIF ultimo_tipo = 'pausa_fin' THEN
      fichaje_tipo := 'salida';
    ELSE
      fichaje_tipo := 'entrada';
    END IF;
  END IF;

  -- 7. Validate transitions
  IF fichaje_tipo = 'entrada' AND ultimo_tipo = 'entrada' THEN
    RAISE EXCEPTION 'Ya existe una entrada activa';
  ELSIF fichaje_tipo = 'salida' AND (ultimo_tipo IS NULL OR ultimo_tipo = 'salida') THEN
    RAISE EXCEPTION 'Debe registrar entrada antes de salida';
  ELSIF fichaje_tipo = 'pausa_inicio' AND (ultimo_tipo IS NULL OR ultimo_tipo = 'salida') THEN
    RAISE EXCEPTION 'Debe registrar entrada antes de iniciar pausa';
  ELSIF fichaje_tipo = 'pausa_fin' AND ultimo_tipo IS DISTINCT FROM 'pausa_inicio' THEN
    RAISE EXCEPTION 'No hay una pausa activa para finalizar';
  END IF;

  -- 8. Insert fichaje with audit data
  INSERT INTO public.fichajes (
    empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado,
    latitud, longitud, confianza_facial, ip_address, datos_adicionales
  ) VALUES (
    p_empleado_id, fichaje_tipo, v_now, v_now, 'facial', 'valido',
    p_lat, p_lng, p_confianza, inet_client_addr(),
    p_datos || jsonb_build_object(
      'device_token', p_device_token,
      'server_timestamp', v_now,
      'security_version', '2.0'
    )
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.kiosk_insert_fichaje_secure IS 
'Secure version of kiosk fichaje with device auth, rate limiting, and audit logging';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kiosk_rate_limit_window ON public.kiosk_rate_limit(empleado_id, window_start);