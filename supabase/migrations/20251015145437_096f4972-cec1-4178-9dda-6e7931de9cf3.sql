-- Reforzar reglas para evitar múltiples ENTRADAS el mismo día y validar transiciones
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
  has_entrada boolean := false;
  has_salida boolean := false;
BEGIN
  -- Estado del día actual
  SELECT EXISTS (
    SELECT 1 FROM public.fichajes
    WHERE empleado_id = p_empleado_id AND DATE(timestamp_real) = CURRENT_DATE AND tipo = 'entrada'
  ) INTO has_entrada;

  SELECT EXISTS (
    SELECT 1 FROM public.fichajes
    WHERE empleado_id = p_empleado_id AND DATE(timestamp_real) = CURRENT_DATE AND tipo = 'salida'
  ) INTO has_salida;

  SELECT tipo
  INTO ultimo_tipo
  FROM public.fichajes
  WHERE empleado_id = p_empleado_id AND DATE(timestamp_real) = CURRENT_DATE
  ORDER BY timestamp_real DESC
  LIMIT 1;

  -- Si ya registró salida hoy, no permitir más acciones
  IF has_salida THEN
    RAISE EXCEPTION 'Ya registraste salida hoy. No se permiten más fichajes en el día';
  END IF;

  -- Determinar tipo solicitado o inferir
  IF p_datos ? 'tipo' THEN
    fichaje_tipo := (p_datos->>'tipo')::fichaje_tipo;
  ELSE
    -- Inferencia de tipo (flujo por defecto)
    IF NOT has_entrada THEN
      fichaje_tipo := 'entrada';
    ELSIF ultimo_tipo = 'pausa_inicio' THEN
      fichaje_tipo := 'pausa_fin';
    ELSIF ultimo_tipo IN ('entrada', 'pausa_fin') THEN
      -- Por defecto, segunda acción será salida si no se especifica pausa
      fichaje_tipo := 'salida';
    ELSE
      fichaje_tipo := 'entrada';
    END IF;
  END IF;

  -- Validaciones de transición
  IF fichaje_tipo = 'entrada' THEN
    IF has_entrada THEN
      RAISE EXCEPTION 'Ya existe una entrada abierta hoy';
    END IF;
  ELSIF fichaje_tipo IN ('pausa_inicio', 'pausa_fin', 'salida') THEN
    IF NOT has_entrada THEN
      RAISE EXCEPTION 'Debe registrar entrada antes de %', fichaje_tipo::text;
    END IF;
    IF fichaje_tipo = 'pausa_fin' AND ultimo_tipo IS DISTINCT FROM 'pausa_inicio' THEN
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