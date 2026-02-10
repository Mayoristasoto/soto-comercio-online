
-- Fix hash_pin to use bcrypt (matching how blanquear_pins_con_dni stores PINs)
CREATE OR REPLACE FUNCTION hash_pin(p_pin TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN crypt(p_pin, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Fix kiosk_verificar_pin to use bcrypt comparison instead of SHA256
CREATE OR REPLACE FUNCTION kiosk_verificar_pin(p_empleado_id UUID, p_pin TEXT)
RETURNS TABLE(valido boolean, empleado_id uuid, nombre text, apellido text, email text, mensaje text, intentos_restantes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin_record RECORD;
  v_empleado RECORD;
  v_max_intentos INTEGER := 5;
  v_bloqueo_minutos INTEGER := 15;
BEGIN
  SELECT valor::integer INTO v_max_intentos
  FROM fichado_configuracion
  WHERE clave = 'pin_max_intentos';
  IF v_max_intentos IS NULL THEN v_max_intentos := 5; END IF;
  
  SELECT valor::integer INTO v_bloqueo_minutos
  FROM fichado_configuracion
  WHERE clave = 'pin_bloqueo_minutos';
  IF v_bloqueo_minutos IS NULL THEN v_bloqueo_minutos := 15; END IF;

  SELECT e.id, e.nombre, e.apellido, e.email, e.activo
  INTO v_empleado
  FROM empleados e
  WHERE e.id = p_empleado_id AND e.activo = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false::boolean, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      'Empleado no encontrado o inactivo'::TEXT, 0::integer;
    RETURN;
  END IF;

  SELECT * INTO v_pin_record
  FROM empleados_pin ep
  WHERE ep.empleado_id = p_empleado_id AND ep.activo = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false::boolean, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      'PIN no configurado para este empleado'::TEXT, 0::integer;
    RETURN;
  END IF;

  IF v_pin_record.bloqueado_hasta IS NOT NULL AND v_pin_record.bloqueado_hasta > now() THEN
    RETURN QUERY SELECT 
      false::boolean, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      ('Cuenta bloqueada. Intente nuevamente en ' || 
        CEIL(EXTRACT(EPOCH FROM (v_pin_record.bloqueado_hasta - now())) / 60)::TEXT || ' minutos')::TEXT, 
      0::integer;
    RETURN;
  END IF;

  -- KEY FIX: Use bcrypt verification instead of SHA256
  -- crypt(input, stored_hash) re-hashes using the stored hash's salt
  -- If the result equals the stored hash, the PIN is correct
  IF v_pin_record.pin_hash = crypt(p_pin, v_pin_record.pin_hash) THEN
    UPDATE empleados_pin
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        ultimo_uso = now(),
        updated_at = now()
    WHERE id = v_pin_record.id;
    
    INSERT INTO fichaje_auditoria (registro_id, tabla_afectada, accion, datos_nuevos, timestamp_accion)
    VALUES (gen_random_uuid(), 'empleados_pin', 'PIN_VERIFIED_SUCCESS', 
      jsonb_build_object('empleado_id', p_empleado_id), now());
    
    RETURN QUERY SELECT 
      true::boolean, 
      v_empleado.id::uuid, 
      v_empleado.nombre::text, 
      v_empleado.apellido::text, 
      v_empleado.email::text,
      'PIN verificado correctamente'::TEXT, 
      v_max_intentos::integer;
  ELSE
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
    
    INSERT INTO fichaje_auditoria (registro_id, tabla_afectada, accion, datos_nuevos, timestamp_accion)
    VALUES (gen_random_uuid(), 'empleados_pin', 'PIN_VERIFIED_FAILED', 
      jsonb_build_object('empleado_id', p_empleado_id, 'intentos', v_pin_record.intentos_fallidos), now());
    
    IF v_pin_record.intentos_fallidos >= v_max_intentos THEN
      RETURN QUERY SELECT 
        false::boolean, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
        ('Demasiados intentos fallidos. Cuenta bloqueada por ' || v_bloqueo_minutos || ' minutos')::TEXT, 
        0::integer;
    ELSE
      RETURN QUERY SELECT 
        false::boolean, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
        'PIN incorrecto'::TEXT, 
        (v_max_intentos - v_pin_record.intentos_fallidos)::integer;
    END IF;
  END IF;
END;
$$;
