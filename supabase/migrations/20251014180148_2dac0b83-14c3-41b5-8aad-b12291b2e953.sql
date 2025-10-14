-- Fix kiosk_insert_fichaje to allow multiple entradas en el día solo después de una salida y mejorar validaciones
CREATE OR REPLACE FUNCTION public.kiosk_insert_fichaje(
  p_empleado_id uuid,
  p_confianza numeric,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_datos jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_id uuid;
  fichaje_tipo fichaje_tipo;
  ultimo_tipo fichaje_tipo;
  ultimo_ts timestamptz;
BEGIN
  -- Obtener el último fichaje del día actual
  SELECT tipo, timestamp_real INTO ultimo_tipo, ultimo_ts
  FROM public.fichajes
  WHERE empleado_id = p_empleado_id
    AND DATE(timestamp_real) = CURRENT_DATE
  ORDER BY timestamp_real DESC
  LIMIT 1;

  -- Determinar tipo solicitado
  IF p_datos ? 'tipo' THEN
    fichaje_tipo := (p_datos->>'tipo')::fichaje_tipo;
  ELSE
    -- Determinar automáticamente basado en el último fichaje
    IF ultimo_tipo IS NULL THEN
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'entrada' THEN
      fichaje_tipo := 'salida';
    ELSIF ultimo_tipo = 'pausa_inicio' THEN
      fichaje_tipo := 'pausa_fin';
    ELSIF ultimo_tipo = 'pausa_fin' THEN
      fichaje_tipo := 'salida';
    ELSIF ultimo_tipo = 'salida' THEN
      fichaje_tipo := 'entrada';
    ELSE
      fichaje_tipo := 'entrada';
    END IF;
  END IF;

  -- Validaciones consistentes (evitan 400 injustificados)
  IF fichaje_tipo = 'entrada' THEN
    -- Solo bloquear si la última acción fue una entrada (entrada abierta)
    IF ultimo_tipo = 'entrada' OR ultimo_tipo = 'pausa_inicio' THEN
      RAISE EXCEPTION 'Ya existe una entrada abierta hoy';
    END IF;
  ELSIF fichaje_tipo = 'salida' THEN
    -- Debe existir una entrada abierta
    IF ultimo_tipo IS NULL OR ultimo_tipo = 'salida' THEN
      RAISE EXCEPTION 'No hay una entrada activa hoy para registrar salida';
    END IF;
  ELSIF fichaje_tipo = 'pausa_inicio' THEN
    -- Solo desde estado dentro
    IF ultimo_tipo IS DISTINCT FROM 'entrada' AND ultimo_tipo IS DISTINCT FROM 'pausa_fin' THEN
      RAISE EXCEPTION 'Debe registrar entrada antes de iniciar una pausa';
    END IF;
  ELSIF fichaje_tipo = 'pausa_fin' THEN
    -- Solo si hay una pausa iniciada
    IF ultimo_tipo IS DISTINCT FROM 'pausa_inicio' THEN
      RAISE EXCEPTION 'No hay una pausa iniciada para finalizar';
    END IF;
  END IF;

  -- Insertar el fichaje
  INSERT INTO public.fichajes (
    empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado,
    latitud, longitud, confianza_facial, ip_address, datos_adicionales
  ) VALUES (
    p_empleado_id, fichaje_tipo, now(), now(), 'facial', 'valido',
    p_lat, p_lng, p_confianza, NULL, p_datos
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;