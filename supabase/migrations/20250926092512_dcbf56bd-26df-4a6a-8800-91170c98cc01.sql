-- Actualizar la función RPC del kiosco para manejar todos los tipos de fichaje
CREATE OR REPLACE FUNCTION public.kiosk_insert_fichaje(
  p_empleado_id uuid, 
  p_confianza numeric, 
  p_lat numeric DEFAULT NULL::numeric, 
  p_lng numeric DEFAULT NULL::numeric, 
  p_datos jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  fichaje_tipo fichaje_tipo;
  ultimo_fichaje_hoy fichaje_tipo;
BEGIN
  -- Obtener el último fichaje del día actual para determinar el siguiente tipo
  SELECT tipo INTO ultimo_fichaje_hoy
  FROM public.fichajes
  WHERE empleado_id = p_empleado_id
    AND DATE(timestamp_real) = CURRENT_DATE
  ORDER BY timestamp_real DESC
  LIMIT 1;

  -- Extraer tipo específico de los datos, si existe
  IF p_datos ? 'tipo' THEN
    fichaje_tipo := (p_datos->>'tipo')::fichaje_tipo;
  ELSE
    -- Determinar automáticamente el tipo basado en el historial
    IF ultimo_fichaje_hoy IS NULL THEN
      -- Primer fichaje del día = entrada
      fichaje_tipo := 'entrada';
    ELSIF ultimo_fichaje_hoy = 'entrada' THEN
      -- Después de entrada, por defecto salida (se puede cambiar desde el cliente)
      fichaje_tipo := 'salida';
    ELSIF ultimo_fichaje_hoy = 'pausa_inicio' THEN
      -- Después de inicio de pausa, debe ser fin de pausa
      fichaje_tipo := 'pausa_fin';
    ELSIF ultimo_fichaje_hoy = 'pausa_fin' THEN
      -- Después de fin de pausa, por defecto salida
      fichaje_tipo := 'salida';
    ELSIF ultimo_fichaje_hoy = 'salida' THEN
      -- Ya salió, no debería poder hacer más fichajes
      RAISE EXCEPTION 'El empleado ya registró su salida hoy';
    ELSE
      -- Fallback
      fichaje_tipo := 'entrada';
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
$function$;