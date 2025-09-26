-- 1. Limpiar Políticas RLS Duplicadas en fichajes
-- Eliminar políticas redundantes manteniendo las más específicas y seguras
DROP POLICY IF EXISTS "empleados_can_insert_own_fichajes" ON fichajes;
DROP POLICY IF EXISTS "Empleados pueden crear sus fichajes" ON fichajes;
DROP POLICY IF EXISTS "empleados_can_manage_own_fichajes" ON fichajes;

-- Eliminar políticas duplicadas en empleados_datos_sensibles
DROP POLICY IF EXISTS "Employee can view own sensitive data limited" ON empleados_datos_sensibles;
-- Mantener solo "Employees can view own basic sensitive data"

-- Eliminar política duplicada en empleados_rostros
DROP POLICY IF EXISTS "admin_can_manage_face_versions" ON empleados_rostros;
-- Mantener solo "admin_rrhh_manage_face_data"

-- 2. Crear tabla de configuración centralizada para reconocimiento facial
CREATE TABLE IF NOT EXISTS public.facial_recognition_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  data_type TEXT DEFAULT 'string',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insertar configuraciones por defecto
INSERT INTO public.facial_recognition_config (key, value, description, data_type) VALUES
('confidence_threshold_kiosk', '0.65', 'Umbral de confianza para kioscos (modo general)', 'decimal'),
('confidence_threshold_specific', '0.60', 'Umbral de confianza para empleado específico', 'decimal'),
('confidence_threshold_demo', '0.35', 'Umbral de confianza para modo demo/fallback', 'decimal'),
('max_attempts_per_minute', '3', 'Máximo intentos de reconocimiento por minuto', 'integer'),
('liveness_timeout_seconds', '30', 'Tiempo límite para detección de liveness', 'integer'),
('face_descriptor_version', '1.0', 'Versión del formato de descriptores faciales', 'string')
ON CONFLICT (key) DO NOTHING;

-- 3. Función para obtener configuración facial
CREATE OR REPLACE FUNCTION public.get_facial_config(config_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = 'public'
AS $function$
  SELECT value 
  FROM public.facial_recognition_config 
  WHERE key = config_key 
  LIMIT 1;
$function$;

-- 4. Habilitar RLS en la nueva tabla
ALTER TABLE public.facial_recognition_config ENABLE ROW LEVEL SECURITY;

-- Política para que admins puedan gestionar la configuración
CREATE POLICY "Admins can manage facial config" 
ON public.facial_recognition_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
);

-- Política para que usuarios autenticados puedan leer configuración básica
CREATE POLICY "Authenticated users can read facial config" 
ON public.facial_recognition_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. Mejorar la función authenticate_face_kiosk con configuración centralizada
CREATE OR REPLACE FUNCTION public.authenticate_face_kiosk(
  p_face_descriptor double precision[], 
  p_threshold double precision DEFAULT NULL
)
RETURNS TABLE(
  empleado_id uuid, 
  nombre text, 
  apellido text, 
  confidence_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result_record RECORD;
  distance double precision;
  best_match RECORD;
  best_distance double precision := 999999;
  threshold_value double precision;
BEGIN
  -- Usar umbral de configuración si no se proporciona uno
  IF p_threshold IS NULL THEN
    SELECT get_facial_config('confidence_threshold_kiosk')::decimal INTO threshold_value;
    IF threshold_value IS NULL THEN
      threshold_value := 0.65; -- fallback
    END IF;
  ELSE
    threshold_value := p_threshold;
  END IF;

  -- Solo permitir acceso desde sesiones autenticadas o en contexto de kiosco
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized access to facial authentication';
  END IF;

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
    -- Log del acceso para auditoría
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
      'FACE_RECOGNITION_SUCCESS',
      jsonb_build_object(
        'empleado_id', best_match.empleado_id,
        'confidence_score', (1.0 - best_distance),
        'threshold_used', threshold_value,
        'distance', best_distance
      ),
      auth.uid(),
      now()
    );

    RETURN QUERY SELECT 
      best_match.empleado_id,
      best_match.nombre,
      best_match.apellido,
      (1.0 - best_distance)::double precision as confidence_score;
  ELSE
    -- Log del intento fallido para auditoría
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
        'reason', 'no_match_found'
      ),
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN;
END;
$function$;

-- 6. Crear trigger para updated_at en facial_recognition_config
CREATE TRIGGER update_facial_config_updated_at
  BEFORE UPDATE ON public.facial_recognition_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();