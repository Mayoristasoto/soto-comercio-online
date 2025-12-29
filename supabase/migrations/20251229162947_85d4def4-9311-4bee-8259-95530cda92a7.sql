-- 1. Update kiosk_fichaje_pin to NOT create pending_upload records - 
--    The client service handles photo storage and record creation
CREATE OR REPLACE FUNCTION public.kiosk_fichaje_pin(
  p_empleado_id uuid,
  p_pin text,
  p_tipo text DEFAULT NULL,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_foto_base64 text DEFAULT NULL, -- kept for backward compat, but ignored for record creation
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

  -- 5. Insertar fichaje (no create foto record here - client service handles it after successful storage upload)
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
$function$;

-- 2. Delete all orphan pending_upload records that will never be fulfilled
DELETE FROM public.fichajes_fotos_verificacion
WHERE foto_url = 'pending_upload';