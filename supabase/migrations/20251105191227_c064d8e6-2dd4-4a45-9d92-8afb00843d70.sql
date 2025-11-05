-- Función para recalcular incidencias de llegadas tarde de un empleado
CREATE OR REPLACE FUNCTION recalcular_fichajes_tardios_empleado(p_empleado_id UUID, p_fecha_desde DATE DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si no se especifica fecha, recalcular últimos 30 días
  IF p_fecha_desde IS NULL THEN
    p_fecha_desde := CURRENT_DATE - INTERVAL '30 days';
  END IF;

  -- Eliminar registros existentes del periodo a recalcular
  DELETE FROM fichajes_tardios
  WHERE empleado_id = p_empleado_id
    AND fecha_fichaje >= p_fecha_desde;

  -- Recalcular llegadas tarde usando los horarios actuales
  INSERT INTO fichajes_tardios (
    empleado_id,
    fichaje_id,
    fecha_fichaje,
    hora_programada,
    hora_real,
    minutos_retraso,
    justificado,
    observaciones
  )
  SELECT
    f.empleado_id,
    f.id,
    f.timestamp_real::date,
    h.hora_entrada::text,
    (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time::text,
    EXTRACT(EPOCH FROM (
      (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time - h.hora_entrada
    ))::integer / 60,
    false,
    'Recalculado con timezone correcto'
  FROM fichajes f
  INNER JOIN empleado_horarios h ON (
    f.empleado_id = h.empleado_id
    AND h.dia_semana = EXTRACT(DOW FROM (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
    AND h.activo = true
  )
  WHERE f.empleado_id = p_empleado_id
    AND f.tipo = 'entrada'
    AND f.timestamp_real::date >= p_fecha_desde
    AND (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time > h.hora_entrada
    AND NOT EXISTS (
      SELECT 1 FROM fichajes_tardios ft
      WHERE ft.fichaje_id = f.id
    );

END;
$$;

-- Función para recalcular pausas excedidas de un empleado
CREATE OR REPLACE FUNCTION recalcular_pausas_excedidas_empleado(p_empleado_id UUID, p_fecha_desde DATE DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_duracion_maxima_minutos INTEGER;
BEGIN
  -- Si no se especifica fecha, recalcular últimos 30 días
  IF p_fecha_desde IS NULL THEN
    p_fecha_desde := CURRENT_DATE - INTERVAL '30 days';
  END IF;

  -- Obtener duración máxima de pausa desde configuración
  SELECT valor::integer INTO v_duracion_maxima_minutos
  FROM fichado_configuracion
  WHERE clave = 'duracion_maxima_pausa_minutos'
  LIMIT 1;

  -- Si no hay configuración, usar 30 minutos por defecto
  IF v_duracion_maxima_minutos IS NULL THEN
    v_duracion_maxima_minutos := 30;
  END IF;

  -- Eliminar registros existentes del periodo a recalcular
  DELETE FROM fichajes_pausas_excedidas
  WHERE empleado_id = p_empleado_id
    AND fecha_fichaje >= p_fecha_desde;

  -- Recalcular pausas excedidas
  INSERT INTO fichajes_pausas_excedidas (
    empleado_id,
    fichaje_pausa_inicio_id,
    fichaje_pausa_fin_id,
    fecha_fichaje,
    hora_inicio_pausa,
    hora_fin_pausa,
    duracion_minutos,
    duracion_permitida_minutos,
    minutos_exceso,
    justificado,
    observaciones
  )
  SELECT
    f_inicio.empleado_id,
    f_inicio.id,
    f_fin.id,
    f_inicio.timestamp_real::date,
    (f_inicio.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time::text,
    (f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time::text,
    EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real))::integer / 60,
    v_duracion_maxima_minutos,
    (EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real))::integer / 60) - v_duracion_maxima_minutos,
    false,
    'Recalculado automáticamente'
  FROM fichajes f_inicio
  INNER JOIN fichajes f_fin ON (
    f_fin.empleado_id = f_inicio.empleado_id
    AND f_fin.tipo = 'pausa_fin'
    AND f_fin.timestamp_real > f_inicio.timestamp_real
    AND f_fin.timestamp_real::date = f_inicio.timestamp_real::date
  )
  WHERE f_inicio.empleado_id = p_empleado_id
    AND f_inicio.tipo = 'pausa_inicio'
    AND f_inicio.timestamp_real::date >= p_fecha_desde
    AND EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real))::integer / 60 > v_duracion_maxima_minutos
    AND NOT EXISTS (
      SELECT 1 FROM fichajes_pausas_excedidas fpe
      WHERE fpe.fichaje_pausa_inicio_id = f_inicio.id
        AND fpe.fichaje_pausa_fin_id = f_fin.id
    );

END;
$$;

-- Función combinada para recalcular todas las incidencias de un empleado
CREATE OR REPLACE FUNCTION recalcular_incidencias_empleado(p_empleado_id UUID, p_fecha_desde DATE DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tardios_antes INTEGER;
  v_tardios_despues INTEGER;
  v_pausas_antes INTEGER;
  v_pausas_despues INTEGER;
BEGIN
  -- Contar registros antes
  SELECT COUNT(*) INTO v_tardios_antes
  FROM fichajes_tardios
  WHERE empleado_id = p_empleado_id;

  SELECT COUNT(*) INTO v_pausas_antes
  FROM fichajes_pausas_excedidas
  WHERE empleado_id = p_empleado_id;

  -- Recalcular
  PERFORM recalcular_fichajes_tardios_empleado(p_empleado_id, p_fecha_desde);
  PERFORM recalcular_pausas_excedidas_empleado(p_empleado_id, p_fecha_desde);

  -- Contar registros después
  SELECT COUNT(*) INTO v_tardios_despues
  FROM fichajes_tardios
  WHERE empleado_id = p_empleado_id;

  SELECT COUNT(*) INTO v_pausas_despues
  FROM fichajes_pausas_excedidas
  WHERE empleado_id = p_empleado_id;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'fichajes_tardios', jsonb_build_object(
      'antes', v_tardios_antes,
      'despues', v_tardios_despues
    ),
    'pausas_excedidas', jsonb_build_object(
      'antes', v_pausas_antes,
      'despues', v_pausas_despues
    )
  );
END;
$$;

-- Permisos para admins
GRANT EXECUTE ON FUNCTION recalcular_fichajes_tardios_empleado TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_pausas_excedidas_empleado TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_incidencias_empleado TO authenticated;