-- Actualizar función kiosk_insert_fichaje con lógica corregida
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
SET search_path TO 'public'
AS $function$
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

  -- Determinar tipo solicitado desde datos o automáticamente
  IF p_datos ? 'tipo' THEN
    fichaje_tipo := (p_datos->>'tipo')::fichaje_tipo;
  ELSE
    -- Determinar automáticamente basado en el último fichaje
    IF ultimo_tipo IS NULL THEN
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'entrada' THEN
      -- Después de entrada: puede ser pausa_inicio o salida
      fichaje_tipo := 'salida';
    ELSIF ultimo_tipo = 'pausa_inicio' THEN
      -- Después de pausa_inicio: debe ser pausa_fin
      fichaje_tipo := 'pausa_fin';
    ELSIF ultimo_tipo = 'pausa_fin' THEN
      -- Después de pausa_fin: puede ser pausa_inicio nuevamente o salida
      fichaje_tipo := 'salida';
    ELSIF ultimo_tipo = 'salida' THEN
      -- Después de salida: nueva entrada
      fichaje_tipo := 'entrada';
    ELSE
      fichaje_tipo := 'entrada';
    END IF;
  END IF;

  -- Validaciones simplificadas
  IF fichaje_tipo = 'pausa_fin' AND ultimo_tipo IS DISTINCT FROM 'pausa_inicio' THEN
    RAISE EXCEPTION 'No hay una pausa activa para finalizar';
  END IF;

  -- Insertar el fichaje (removemos las validaciones que bloquean múltiples fichajes)
  INSERT INTO public.fichajes (
    empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado,
    latitud, longitud, confianza_facial, ip_address, datos_adicionales
  ) VALUES (
    p_empleado_id, fichaje_tipo, now(), now(), 'facial', 'valido',
    p_lat, p_lng, p_confianza, NULL, p_datos
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;