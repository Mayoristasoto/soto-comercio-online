-- Arreglar tipo de dato en verificar_empleados_sin_salida
-- El EXTRACT retorna NUMERIC pero la función declara INTEGER

CREATE OR REPLACE FUNCTION public.verificar_empleados_sin_salida()
RETURNS TABLE(
  empleado_id UUID,
  nombre_completo TEXT,
  telefono TEXT,
  hora_salida_esperada TIME,
  minutos_retraso INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  config_retraso INTEGER;
BEGIN
  -- Obtener configuración de retraso
  SELECT valor::INTEGER INTO config_retraso
  FROM fichado_configuracion
  WHERE clave = 'whatsapp_retraso_minutos';
  
  IF config_retraso IS NULL THEN
    config_retraso := 15; -- valor por defecto
  END IF;

  RETURN QUERY
  WITH empleados_con_entrada AS (
    -- Empleados que registraron entrada hoy pero no salida
    SELECT DISTINCT
      f.empleado_id,
      e.nombre || ' ' || e.apellido as nombre_completo,
      eds.telefono,
      ft.hora_salida as hora_salida_esperada
    FROM fichajes f
    JOIN empleados e ON f.empleado_id = e.id
    JOIN empleados_datos_sensibles eds ON e.id = eds.empleado_id
    JOIN empleado_turnos et ON e.id = et.empleado_id
    JOIN fichado_turnos ft ON et.turno_id = ft.id
    WHERE DATE(f.timestamp_real) = CURRENT_DATE
      AND f.tipo = 'entrada'
      AND f.estado = 'valido'
      AND e.activo = true
      AND eds.telefono IS NOT NULL
      AND eds.telefono != ''
      AND ft.activo = true
      -- Verificar que NO hay salida registrada hoy
      AND NOT EXISTS (
        SELECT 1 FROM fichajes f2 
        WHERE f2.empleado_id = f.empleado_id 
        AND DATE(f2.timestamp_real) = CURRENT_DATE
        AND f2.tipo = 'salida'
        AND f2.estado = 'valido'
      )
      -- Verificar que ya pasó el tiempo esperado + retraso
      AND CURRENT_TIME > (ft.hora_salida + (config_retraso || ' minutes')::INTERVAL)
      -- Verificar que no se envió notificación hoy
      AND NOT EXISTS (
        SELECT 1 FROM notificaciones_salida ns
        WHERE ns.empleado_id = f.empleado_id
        AND ns.fecha_fichaje = CURRENT_DATE
      )
  )
  SELECT 
    ece.empleado_id,
    ece.nombre_completo,
    ece.telefono,
    ece.hora_salida_esperada,
    -- FIX: Convertir NUMERIC a INTEGER
    ROUND(EXTRACT(EPOCH FROM (CURRENT_TIME - (ece.hora_salida_esperada + (config_retraso || ' minutes')::INTERVAL)))/60)::INTEGER as minutos_retraso
  FROM empleados_con_entrada ece;
END;
$$;