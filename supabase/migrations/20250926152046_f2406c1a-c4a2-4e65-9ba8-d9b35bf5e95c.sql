-- Arreglar la función authenticate_face_kiosk para manejar mejor los errores de auditoría
CREATE OR REPLACE FUNCTION public.authenticate_face_kiosk(p_face_descriptor double precision[], p_threshold double precision DEFAULT NULL::double precision)
 RETURNS TABLE(empleado_id uuid, nombre text, apellido text, confidence_score double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_record RECORD;
  distance double precision;
  best_match RECORD;
  best_distance double precision := 999999;
  threshold_value double precision;
  system_user_id uuid;
BEGIN
  -- Usar umbral de configuración si no se proporciona uno
  IF p_threshold IS NULL THEN
    SELECT get_facial_config('confidence_threshold_kiosk')::decimal INTO threshold_value;
    IF threshold_value IS NULL THEN
      threshold_value := 0.55; -- valor actualizado
    END IF;
  ELSE
    threshold_value := p_threshold;
  END IF;

  -- Intentar obtener un usuario del sistema para auditoría
  -- Usar un enfoque más seguro que no cause errores de FK
  SELECT e.id INTO system_user_id 
  FROM empleados e
  WHERE e.rol = 'admin_rrhh' AND e.activo = true AND e.user_id IS NOT NULL 
  LIMIT 1;

  -- Buscar la mejor coincidencia entre empleados activos con datos faciales
  FOR result_record IN 
    SELECT 
      er.empleado_id,
      er.face_descriptor,
      er.confidence_score,
      e.nombre,
      e.apellido,
      e.activo
    FROM empleados_rostros er
    JOIN empleados e ON e.id = er.empleado_id
    WHERE er.is_active = true 
    AND e.activo = true
  LOOP
    -- Calcular distancia euclidiana entre descriptores
    SELECT sqrt(
      (SELECT sum(power(a.val - b.val, 2)) 
       FROM unnest(p_face_descriptor) WITH ORDINALITY a(val, idx)
       JOIN unnest(result_record.face_descriptor) WITH ORDINALITY b(val, idx) 
       ON a.idx = b.idx)
    ) INTO distance;
    
    -- Seguir el mejor match
    IF distance < best_distance AND distance <= threshold_value THEN
      best_distance := distance;
      best_match := result_record;
    END IF;
  END LOOP;

  -- Devolver el mejor match si se encontró
  IF best_match IS NOT NULL THEN
    -- Log del acceso para auditoría - usando empleado_id en lugar de user_id
    BEGIN
      INSERT INTO public.fichaje_auditoria (
        registro_id, 
        tabla_afectada, 
        accion, 
        datos_nuevos, 
        usuario_id, -- Usar NULL en lugar de user_id problemático
        timestamp_accion
      ) VALUES (
        gen_random_uuid(),
        'facial_authentication',
        'FACE_RECOGNITION_SUCCESS',
        jsonb_build_object(
          'empleado_id', best_match.empleado_id,
          'confidence_score', (1.0 - best_distance),
          'threshold_used', threshold_value,
          'distance', best_distance,
          'system_empleado_id', system_user_id
        ),
        NULL, -- No usar user_id para evitar problemas de FK
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si falla el logging, continuar sin interrumpir el proceso principal
      NULL;
    END;

    RETURN QUERY SELECT 
      best_match.empleado_id,
      best_match.nombre,
      best_match.apellido,
      (1.0 - best_distance)::double precision as confidence_score;
  ELSE
    -- Log del intento fallido para auditoría
    BEGIN
      INSERT INTO public.fichaje_auditoria (
        registro_id, 
        tabla_afectada, 
        accion, 
        datos_nuevos, 
        usuario_id,
        timestamp_accion
      ) VALUES (
        gen_random_uuid(),
        'facial_authentication',
        'FACE_RECOGNITION_FAILED',
        jsonb_build_object(
          'threshold_used', threshold_value,
          'best_distance', best_distance,
          'reason', 'no_match_found',
          'system_empleado_id', system_user_id
        ),
        NULL, -- No usar user_id para evitar problemas de FK
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si falla el logging, continuar sin interrumpir el proceso principal
      NULL;
    END;
  END IF;
  
  RETURN;
END;
$function$;