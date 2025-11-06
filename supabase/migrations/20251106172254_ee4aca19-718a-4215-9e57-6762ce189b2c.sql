
-- Función para recalcular pausas excedidas con timezone correcto
CREATE OR REPLACE FUNCTION recalcular_pausas_excedidas_fecha(p_fecha date DEFAULT CURRENT_DATE)
RETURNS TABLE(registros_eliminados bigint, registros_creados bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_eliminados bigint;
  v_creados bigint;
BEGIN
  -- Eliminar registros incorrectos de la fecha especificada
  DELETE FROM fichajes_pausas_excedidas 
  WHERE fecha_fichaje = p_fecha;
  
  GET DIAGNOSTICS v_eliminados = ROW_COUNT;
  
  -- Recalcular correctamente con timezone Argentina
  WITH pausas_del_dia AS (
    SELECT 
      f1.empleado_id,
      f1.timestamp_real as inicio_timestamp,
      f2.timestamp_real as fin_timestamp,
      (f1.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time as hora_inicio_arg,
      (f2.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time as hora_fin_arg,
      EXTRACT(EPOCH FROM (f2.timestamp_real - f1.timestamp_real)) / 60 as duracion_min,
      et.turno_id,
      COALESCE(ft.duracion_pausa_minutos, 40) as duracion_permitida
    FROM fichajes f1
    JOIN fichajes f2 ON f2.empleado_id = f1.empleado_id 
      AND f2.tipo = 'pausa_fin'
      AND f2.timestamp_real > f1.timestamp_real
      AND DATE(f2.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = DATE(f1.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')
    LEFT JOIN empleado_turnos et ON et.empleado_id = f1.empleado_id 
      AND et.activo = true
      AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= p_fecha)
      AND (et.fecha_fin IS NULL OR et.fecha_fin >= p_fecha)
    LEFT JOIN fichado_turnos ft ON ft.id = et.turno_id AND ft.activo = true
    WHERE f1.tipo = 'pausa_inicio'
      AND f1.estado = 'valido'
      AND f2.estado = 'valido'
      AND DATE(f1.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = p_fecha
      AND NOT EXISTS (
        SELECT 1 FROM fichajes f3
        WHERE f3.empleado_id = f1.empleado_id
          AND f3.tipo IN ('pausa_inicio', 'pausa_fin')
          AND f3.timestamp_real > f1.timestamp_real
          AND f3.timestamp_real < f2.timestamp_real
          AND f3.estado = 'valido'
      )
  )
  INSERT INTO fichajes_pausas_excedidas (
    empleado_id,
    fecha_fichaje,
    hora_inicio_pausa,
    hora_fin_pausa,
    duracion_minutos,
    duracion_permitida_minutos,
    minutos_exceso,
    turno_id,
    observaciones
  )
  SELECT 
    empleado_id,
    p_fecha,
    hora_inicio_arg,
    hora_fin_arg,
    ROUND(duracion_min)::integer,
    duracion_permitida,
    ROUND(duracion_min)::integer - duracion_permitida,
    turno_id,
    'Recalculado automáticamente con timezone Argentina (ART)'
  FROM pausas_del_dia
  WHERE duracion_min > duracion_permitida;
  
  GET DIAGNOSTICS v_creados = ROW_COUNT;
  
  RETURN QUERY SELECT v_eliminados, v_creados;
END;
$$;

-- Ejecutar recálculo para el 5 de noviembre de 2025
SELECT * FROM recalcular_pausas_excedidas_fecha('2025-11-05');
