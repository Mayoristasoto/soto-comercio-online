-- Fix: kiosk_fichaje_pin must always load v_ultimo_tipo even when p_tipo is provided,
-- otherwise explicit actions like pausa_inicio/pausa_fin/salida fail with "Debe registrar entrada...".

CREATE OR REPLACE FUNCTION public.kiosk_fichaje_pin(
  p_empleado_id uuid,
  p_pin text,
  p_tipo text DEFAULT NULL::text,
  p_lat numeric DEFAULT NULL::numeric,
  p_lng numeric DEFAULT NULL::numeric,
  p_foto_base64 text DEFAULT NULL::text,
  p_datos jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(success boolean, fichaje_id uuid, mensaje text, tipo_fichaje text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- 2. Obtener el último fichaje del "día" (zona horaria de negocio)
  SELECT tipo INTO v_ultimo_tipo
  FROM fichajes
  WHERE empleado_id = p_empleado_id
    AND DATE(timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') =
        DATE(v_now AT TIME ZONE 'America/Argentina/Buenos_Aires')
    AND estado = 'valido'
  ORDER BY timestamp_real DESC
  LIMIT 1;

  -- 3. Determinar tipo de fichaje si no se especificó
  IF p_tipo IS NULL THEN
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

  -- 4. Validar transiciones
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

  -- 5. Insertar fichaje
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

  -- 6. Guardar registro de foto de verificación (si se proporcionó)
  IF p_foto_base64 IS NOT NULL AND length(p_foto_base64) > 100 THEN
    v_foto_path := p_empleado_id::TEXT || '/' || EXTRACT(EPOCH FROM v_now)::BIGINT || '.jpg';

    INSERT INTO fichajes_fotos_verificacion (
      empleado_id, fichaje_id, foto_storage_path, foto_url,
      latitud, longitud, metodo_fichaje, confianza_facial, timestamp_captura
    ) VALUES (
      p_empleado_id, v_fichaje_id, v_foto_path,
      'pending_upload',
      p_lat, p_lng, 'pin', 0, v_now
    );
  END IF;

  -- 7. Log de auditoría
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
$function$;
