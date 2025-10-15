
-- Actualizar función para permitir ciclos de entrada/salida en el mismo día
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
BEGIN
  -- Obtener el último tipo de fichaje del día
  SELECT tipo
  INTO ultimo_tipo
  FROM public.fichajes
  WHERE empleado_id = p_empleado_id 
  AND DATE(timestamp_real) = CURRENT_DATE
  AND estado = 'valido'
  ORDER BY timestamp_real DESC
  LIMIT 1;

  -- Determinar tipo solicitado o inferir
  IF p_datos ? 'tipo' THEN
    fichaje_tipo := (p_datos->>'tipo')::fichaje_tipo;
  ELSE
    -- Inferencia de tipo según el último fichaje
    IF ultimo_tipo IS NULL THEN
      -- Primera vez del día: entrada
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'entrada' THEN
      -- Después de entrada: salida o pausa_inicio
      fichaje_tipo := 'salida';
    ELSIF ultimo_tipo = 'salida' THEN
      -- Después de salida: nueva entrada (permite reingreso)
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'pausa_inicio' THEN
      -- Después de pausa_inicio: pausa_fin
      fichaje_tipo := 'pausa_fin';
    ELSIF ultimo_tipo = 'pausa_fin' THEN
      -- Después de pausa_fin: salida
      fichaje_tipo := 'salida';
    ELSE
      -- Por defecto
      fichaje_tipo := 'entrada';
    END IF;
  END IF;

  -- VALIDACIONES DE TRANSICIÓN
  IF fichaje_tipo = 'entrada' THEN
    -- No permitir entrada consecutiva
    IF ultimo_tipo = 'entrada' THEN
      RAISE EXCEPTION 'Ya existe una entrada activa. Debes registrar salida antes de una nueva entrada';
    END IF;
  ELSIF fichaje_tipo = 'salida' THEN
    -- Debe haber entrada previa (no puede ser la primera acción del día)
    IF ultimo_tipo IS NULL THEN
      RAISE EXCEPTION 'Debe registrar entrada antes de salida';
    END IF;
    -- No permitir salida consecutiva
    IF ultimo_tipo = 'salida' THEN
      RAISE EXCEPTION 'Ya registraste salida. La próxima acción debe ser entrada';
    END IF;
  ELSIF fichaje_tipo = 'pausa_inicio' THEN
    -- Debe haber entrada previa
    IF ultimo_tipo IS NULL OR ultimo_tipo = 'salida' THEN
      RAISE EXCEPTION 'Debe registrar entrada antes de iniciar pausa';
    END IF;
    -- No permitir pausa consecutiva
    IF ultimo_tipo = 'pausa_inicio' THEN
      RAISE EXCEPTION 'Ya hay una pausa activa. Debes finalizarla antes de iniciar otra';
    END IF;
  ELSIF fichaje_tipo = 'pausa_fin' THEN
    -- Debe existir pausa_inicio previa
    IF ultimo_tipo IS DISTINCT FROM 'pausa_inicio' THEN
      RAISE EXCEPTION 'No hay una pausa activa para finalizar';
    END IF;
  END IF;

  -- Insertar fichaje válido
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
