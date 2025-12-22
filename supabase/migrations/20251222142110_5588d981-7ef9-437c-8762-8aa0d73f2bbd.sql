
-- =============================================
-- Sistema de Fichaje con PIN + Foto Verificación
-- =============================================

-- 1. Tabla para almacenar PINs de empleados
CREATE TABLE IF NOT EXISTS public.empleados_pin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  ultimo_uso TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES public.empleados(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT empleados_pin_empleado_unique UNIQUE (empleado_id)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_empleados_pin_empleado ON public.empleados_pin(empleado_id);
CREATE INDEX IF NOT EXISTS idx_empleados_pin_activo ON public.empleados_pin(activo) WHERE activo = true;

-- Habilitar RLS
ALTER TABLE public.empleados_pin ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empleados_pin
CREATE POLICY "Admin puede gestionar PINs"
  ON public.empleados_pin FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Gerentes pueden ver PINs de su sucursal"
  ON public.empleados_pin FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados e1
      JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
      WHERE e1.user_id = auth.uid()
      AND e1.rol = 'gerente_sucursal'
      AND e1.activo = true
      AND e2.id = empleados_pin.empleado_id
    )
  );

-- 2. Función para hashear PIN (simple pero efectiva)
CREATE OR REPLACE FUNCTION public.hash_pin(p_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Usar SHA256 con salt fijo para PINs (suficiente para 4-6 dígitos)
  RETURN encode(sha256(('SOTO_PIN_SALT_2024' || p_pin)::bytea), 'hex');
END;
$$;

-- 3. Función RPC para verificar PIN desde kiosco (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.kiosk_verificar_pin(
  p_empleado_id UUID,
  p_pin TEXT
)
RETURNS TABLE(
  valido BOOLEAN,
  empleado_id UUID,
  nombre TEXT,
  apellido TEXT,
  email TEXT,
  mensaje TEXT,
  intentos_restantes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_record RECORD;
  v_empleado RECORD;
  v_max_intentos INTEGER := 5;
  v_bloqueo_minutos INTEGER := 15;
  v_hash TEXT;
BEGIN
  -- Obtener configuración de intentos máximos
  SELECT valor::integer INTO v_max_intentos
  FROM fichado_configuracion
  WHERE clave = 'pin_max_intentos';
  IF v_max_intentos IS NULL THEN v_max_intentos := 5; END IF;
  
  -- Obtener configuración de minutos de bloqueo
  SELECT valor::integer INTO v_bloqueo_minutos
  FROM fichado_configuracion
  WHERE clave = 'pin_bloqueo_minutos';
  IF v_bloqueo_minutos IS NULL THEN v_bloqueo_minutos := 15; END IF;

  -- Verificar que el empleado existe y está activo
  SELECT id, nombre, apellido, email, activo
  INTO v_empleado
  FROM empleados
  WHERE id = p_empleado_id AND activo = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      'Empleado no encontrado o inactivo'::TEXT, 0;
    RETURN;
  END IF;

  -- Obtener registro de PIN
  SELECT * INTO v_pin_record
  FROM empleados_pin
  WHERE empleado_id = p_empleado_id AND activo = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      'PIN no configurado para este empleado'::TEXT, 0;
    RETURN;
  END IF;

  -- Verificar si está bloqueado
  IF v_pin_record.bloqueado_hasta IS NOT NULL AND v_pin_record.bloqueado_hasta > now() THEN
    RETURN QUERY SELECT 
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      ('Cuenta bloqueada. Intente nuevamente en ' || 
        CEIL(EXTRACT(EPOCH FROM (v_pin_record.bloqueado_hasta - now())) / 60)::TEXT || ' minutos')::TEXT, 
      0;
    RETURN;
  END IF;

  -- Calcular hash del PIN ingresado
  v_hash := hash_pin(p_pin);

  -- Verificar PIN
  IF v_pin_record.pin_hash = v_hash THEN
    -- PIN correcto - resetear intentos y actualizar último uso
    UPDATE empleados_pin
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        ultimo_uso = now(),
        updated_at = now()
    WHERE id = v_pin_record.id;
    
    -- Log de éxito
    INSERT INTO fichaje_auditoria (registro_id, tabla_afectada, accion, datos_nuevos, timestamp_accion)
    VALUES (gen_random_uuid(), 'empleados_pin', 'PIN_VERIFIED_SUCCESS', 
      jsonb_build_object('empleado_id', p_empleado_id), now());
    
    RETURN QUERY SELECT 
      true, v_empleado.id, v_empleado.nombre, v_empleado.apellido, v_empleado.email,
      'PIN verificado correctamente'::TEXT, v_max_intentos;
  ELSE
    -- PIN incorrecto - incrementar intentos
    UPDATE empleados_pin
    SET intentos_fallidos = intentos_fallidos + 1,
        bloqueado_hasta = CASE 
          WHEN intentos_fallidos + 1 >= v_max_intentos 
          THEN now() + (v_bloqueo_minutos || ' minutes')::INTERVAL
          ELSE NULL
        END,
        updated_at = now()
    WHERE id = v_pin_record.id
    RETURNING intentos_fallidos INTO v_pin_record.intentos_fallidos;
    
    -- Log de fallo
    INSERT INTO fichaje_auditoria (registro_id, tabla_afectada, accion, datos_nuevos, timestamp_accion)
    VALUES (gen_random_uuid(), 'empleados_pin', 'PIN_VERIFIED_FAILED', 
      jsonb_build_object('empleado_id', p_empleado_id, 'intentos', v_pin_record.intentos_fallidos), now());
    
    IF v_pin_record.intentos_fallidos >= v_max_intentos THEN
      RETURN QUERY SELECT 
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
        ('Demasiados intentos fallidos. Cuenta bloqueada por ' || v_bloqueo_minutos || ' minutos')::TEXT, 
        0;
    ELSE
      RETURN QUERY SELECT 
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
        'PIN incorrecto'::TEXT, 
        (v_max_intentos - v_pin_record.intentos_fallidos);
    END IF;
  END IF;
END;
$$;

-- 4. Función RPC para registrar fichaje con PIN (captura foto obligatoria)
CREATE OR REPLACE FUNCTION public.kiosk_fichaje_pin(
  p_empleado_id UUID,
  p_pin TEXT,
  p_tipo TEXT DEFAULT NULL,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL,
  p_foto_base64 TEXT DEFAULT NULL,
  p_datos JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  fichaje_id UUID,
  mensaje TEXT,
  tipo_fichaje TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verificacion RECORD;
  v_ultimo_tipo TEXT;
  v_nuevo_tipo TEXT;
  v_fichaje_id UUID;
  v_foto_path TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Verificar PIN primero
  SELECT * INTO v_verificacion
  FROM kiosk_verificar_pin(p_empleado_id, p_pin);
  
  IF NOT v_verificacion.valido THEN
    RETURN QUERY SELECT false, NULL::UUID, v_verificacion.mensaje, NULL::TEXT;
    RETURN;
  END IF;

  -- 2. Determinar tipo de fichaje si no se especificó
  IF p_tipo IS NULL THEN
    SELECT tipo INTO v_ultimo_tipo
    FROM fichajes
    WHERE empleado_id = p_empleado_id
    AND DATE(timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = 
        DATE(v_now AT TIME ZONE 'America/Argentina/Buenos_Aires')
    AND estado = 'valido'
    ORDER BY timestamp_real DESC
    LIMIT 1;
    
    IF v_ultimo_tipo IS NULL THEN
      v_nuevo_tipo := 'entrada';
    ELSIF v_ultimo_tipo = 'entrada' THEN
      v_nuevo_tipo := 'salida';
    ELSIF v_ultimo_tipo = 'salida' THEN
      v_nuevo_tipo := 'entrada';
    ELSIF v_ultimo_tipo = 'pausa_inicio' THEN
      v_nuevo_tipo := 'pausa_fin';
    ELSIF v_ultimo_tipo = 'pausa_fin' THEN
      v_nuevo_tipo := 'salida';
    ELSE
      v_nuevo_tipo := 'entrada';
    END IF;
  ELSE
    v_nuevo_tipo := p_tipo;
  END IF;

  -- 3. Validar transiciones
  IF v_nuevo_tipo = 'entrada' AND v_ultimo_tipo = 'entrada' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Ya existe una entrada activa'::TEXT, NULL::TEXT;
    RETURN;
  ELSIF v_nuevo_tipo = 'salida' AND (v_ultimo_tipo IS NULL OR v_ultimo_tipo = 'salida') THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Debe registrar entrada antes de salida'::TEXT, NULL::TEXT;
    RETURN;
  ELSIF v_nuevo_tipo = 'pausa_inicio' AND (v_ultimo_tipo IS NULL OR v_ultimo_tipo = 'salida') THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Debe registrar entrada antes de iniciar pausa'::TEXT, NULL::TEXT;
    RETURN;
  ELSIF v_nuevo_tipo = 'pausa_fin' AND v_ultimo_tipo IS DISTINCT FROM 'pausa_inicio' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'No hay una pausa activa para finalizar'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- 4. Insertar fichaje
  INSERT INTO fichajes (
    empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado,
    latitud, longitud, confianza_facial, ip_address, datos_adicionales
  ) VALUES (
    p_empleado_id, v_nuevo_tipo::fichaje_tipo, v_now, v_now, 'pin', 'valido',
    p_lat, p_lng, NULL, inet_client_addr(),
    p_datos || jsonb_build_object(
      'metodo_autenticacion', 'pin',
      'server_timestamp', v_now,
      'requiere_foto_verificacion', true
    )
  ) RETURNING id INTO v_fichaje_id;

  -- 5. Guardar registro de foto de verificación (si se proporcionó)
  IF p_foto_base64 IS NOT NULL AND length(p_foto_base64) > 100 THEN
    v_foto_path := p_empleado_id::TEXT || '/' || EXTRACT(EPOCH FROM v_now)::BIGINT || '.jpg';
    
    INSERT INTO fichajes_fotos_verificacion (
      empleado_id, fichaje_id, foto_storage_path, foto_url,
      latitud, longitud, metodo_fichaje, confianza_facial, timestamp_captura
    ) VALUES (
      p_empleado_id, v_fichaje_id, v_foto_path, 
      'pending_upload', -- Se actualizará después de subir al storage
      p_lat, p_lng, 'pin', 0, v_now
    );
  END IF;

  -- 6. Log de auditoría
  INSERT INTO fichaje_auditoria (registro_id, tabla_afectada, accion, datos_nuevos, timestamp_accion)
  VALUES (v_fichaje_id, 'fichajes', 'FICHAJE_PIN_CREATED', 
    jsonb_build_object(
      'empleado_id', p_empleado_id,
      'tipo', v_nuevo_tipo,
      'metodo', 'pin',
      'tiene_foto', p_foto_base64 IS NOT NULL
    ), v_now);

  RETURN QUERY SELECT true, v_fichaje_id, 
    ('Fichaje de ' || v_nuevo_tipo || ' registrado correctamente')::TEXT, v_nuevo_tipo;
END;
$$;

-- 5. Función para que admin establezca/cambie PIN de empleado
CREATE OR REPLACE FUNCTION public.admin_set_empleado_pin(
  p_empleado_id UUID,
  p_nuevo_pin TEXT
)
RETURNS TABLE(success BOOLEAN, mensaje TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_admin_id UUID;
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT current_user_is_admin() THEN
    -- También permitir a gerentes de sucursal para su propia sucursal
    IF NOT EXISTS (
      SELECT 1 FROM empleados e1
      JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
      WHERE e1.user_id = auth.uid()
      AND e1.rol = 'gerente_sucursal'
      AND e1.activo = true
      AND e2.id = p_empleado_id
    ) THEN
      RETURN QUERY SELECT false, 'No tiene permisos para modificar PINs'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Validar formato del PIN (4-6 dígitos)
  IF p_nuevo_pin !~ '^\d{4,6}$' THEN
    RETURN QUERY SELECT false, 'El PIN debe tener entre 4 y 6 dígitos numéricos'::TEXT;
    RETURN;
  END IF;

  -- Obtener ID del admin actual
  SELECT id INTO v_admin_id FROM empleados WHERE user_id = auth.uid();

  -- Calcular hash
  v_hash := hash_pin(p_nuevo_pin);

  -- Insertar o actualizar PIN
  INSERT INTO empleados_pin (empleado_id, pin_hash, creado_por, activo)
  VALUES (p_empleado_id, v_hash, v_admin_id, true)
  ON CONFLICT (empleado_id) DO UPDATE SET
    pin_hash = v_hash,
    intentos_fallidos = 0,
    bloqueado_hasta = NULL,
    activo = true,
    updated_at = now();

  -- Log de auditoría
  INSERT INTO fichaje_auditoria (registro_id, tabla_afectada, accion, datos_nuevos, usuario_id, timestamp_accion)
  VALUES (gen_random_uuid(), 'empleados_pin', 'PIN_SET_BY_ADMIN', 
    jsonb_build_object('empleado_id', p_empleado_id, 'set_by', v_admin_id), 
    v_admin_id, now());

  RETURN QUERY SELECT true, 'PIN configurado correctamente'::TEXT;
END;
$$;

-- 6. Función para desbloquear empleado (admin)
CREATE OR REPLACE FUNCTION public.admin_desbloquear_pin(p_empleado_id UUID)
RETURNS TABLE(success BOOLEAN, mensaje TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RETURN QUERY SELECT false, 'Solo administradores pueden desbloquear PINs'::TEXT;
    RETURN;
  END IF;

  UPDATE empleados_pin
  SET intentos_fallidos = 0,
      bloqueado_hasta = NULL,
      updated_at = now()
  WHERE empleado_id = p_empleado_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No se encontró registro de PIN para este empleado'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Empleado desbloqueado correctamente'::TEXT;
END;
$$;

-- 7. Función para obtener empleado por legajo/DNI para kiosco
CREATE OR REPLACE FUNCTION public.kiosk_buscar_empleado(p_busqueda TEXT)
RETURNS TABLE(
  id UUID,
  nombre TEXT,
  apellido TEXT,
  legajo TEXT,
  tiene_pin BOOLEAN,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.legajo,
    EXISTS(SELECT 1 FROM empleados_pin ep WHERE ep.empleado_id = e.id AND ep.activo = true) as tiene_pin,
    e.avatar_url
  FROM empleados e
  WHERE e.activo = true
  AND (
    e.legajo ILIKE '%' || p_busqueda || '%'
    OR e.dni ILIKE '%' || p_busqueda || '%'
    OR e.nombre ILIKE '%' || p_busqueda || '%'
    OR e.apellido ILIKE '%' || p_busqueda || '%'
    OR (e.nombre || ' ' || e.apellido) ILIKE '%' || p_busqueda || '%'
  )
  ORDER BY e.apellido, e.nombre
  LIMIT 10;
END;
$$;

-- 8. Agregar configuraciones de PIN al sistema
INSERT INTO fichado_configuracion (clave, valor, descripcion, tipo)
VALUES 
  ('pin_habilitado', 'true', 'Habilitar fichaje con PIN en kiosco', 'boolean'),
  ('pin_longitud_minima', '4', 'Longitud mínima del PIN', 'number'),
  ('pin_longitud_maxima', '6', 'Longitud máxima del PIN', 'number'),
  ('pin_max_intentos', '5', 'Intentos máximos antes de bloqueo', 'number'),
  ('pin_bloqueo_minutos', '15', 'Minutos de bloqueo tras exceder intentos', 'number'),
  ('pin_foto_obligatoria', 'true', 'Requerir foto al fichar con PIN', 'boolean')
ON CONFLICT (clave) DO NOTHING;
