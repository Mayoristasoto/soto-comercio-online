-- Fix recalcular functions to use empleado_turnos + fichado_turnos instead of empleado_horarios
CREATE OR REPLACE FUNCTION public.recalcular_fichajes_tardios_empleado(p_empleado_id UUID, p_fecha_desde DATE DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha_desde DATE := p_fecha_desde;
BEGIN
  IF v_fecha_desde IS NULL THEN
    v_fecha_desde := CURRENT_DATE - INTERVAL '30 days';
  END IF;

  DELETE FROM public.fichajes_tardios
  WHERE empleado_id = p_empleado_id
    AND fecha_fichaje >= v_fecha_desde;

  INSERT INTO public.fichajes_tardios (
    empleado_id,
    fecha_fichaje,
    hora_programada,
    hora_real,
    minutos_retraso,
    justificado,
    observaciones
  )
  SELECT 
    f.empleado_id,
    (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE AS fecha_fichaje,
    ft.hora_entrada,
    (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME AS hora_real,
    EXTRACT(EPOCH FROM (
      (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME -
      (ft.hora_entrada + COALESCE(ft.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute')
    ))::INTEGER / 60 AS minutos_retraso,
    false,
    'Recalculado con timezone correcto'
  FROM public.fichajes f
  JOIN public.empleado_turnos et ON et.empleado_id = f.empleado_id AND et.activo = true
  JOIN public.fichado_turnos ft ON ft.id = et.turno_id AND ft.activo = true
  WHERE f.empleado_id = p_empleado_id
    AND f.tipo = 'entrada'
    AND DATE(f.timestamp_real) >= v_fecha_desde
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(f.timestamp_real))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(f.timestamp_real))
    AND (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME > (ft.hora_entrada + COALESCE(ft.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute');
END;
$$;

-- Recalculate pauses excess using assigned turnos
CREATE OR REPLACE FUNCTION public.recalcular_pausas_excedidas_empleado(p_empleado_id UUID, p_fecha_desde DATE DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha_desde DATE := p_fecha_desde;
BEGIN
  IF v_fecha_desde IS NULL THEN
    v_fecha_desde := CURRENT_DATE - INTERVAL '30 days';
  END IF;

  DELETE FROM public.fichajes_pausas_excedidas
  WHERE empleado_id = p_empleado_id
    AND fecha_fichaje >= v_fecha_desde;

  INSERT INTO public.fichajes_pausas_excedidas (
    empleado_id,
    fecha_fichaje,
    hora_inicio_pausa,
    hora_fin_pausa,
    duracion_minutos,
    duracion_permitida_minutos,
    minutos_exceso,
    turno_id,
    justificado,
    observaciones
  )
  SELECT
    f_inicio.empleado_id,
    (f_inicio.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE AS fecha_fichaje,
    (f_inicio.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME AS hora_inicio_pausa,
    (f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME AS hora_fin_pausa,
    EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real))::INTEGER / 60 AS duracion_minutos,
    COALESCE(ft.duracion_pausa_minutos, 40) AS duracion_permitida_minutos,
    (EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real))::INTEGER / 60) - COALESCE(ft.duracion_pausa_minutos, 40) AS minutos_exceso,
    ft.id AS turno_id,
    false,
    'Recalculado automáticamente'
  FROM public.fichajes f_inicio
  JOIN LATERAL (
    SELECT f.*
    FROM public.fichajes f
    WHERE f.empleado_id = f_inicio.empleado_id
      AND f.tipo = 'pausa_fin'
      AND DATE(f.timestamp_real) = DATE(f_inicio.timestamp_real)
      AND f.timestamp_real > f_inicio.timestamp_real
    ORDER BY f.timestamp_real
    LIMIT 1
  ) f_fin ON TRUE
  JOIN public.empleado_turnos et ON et.empleado_id = f_inicio.empleado_id AND et.activo = true
  JOIN public.fichado_turnos ft ON ft.id = et.turno_id AND ft.activo = true
  WHERE f_inicio.empleado_id = p_empleado_id
    AND f_inicio.tipo = 'pausa_inicio'
    AND DATE(f_inicio.timestamp_real) >= v_fecha_desde
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(f_inicio.timestamp_real))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(f_inicio.timestamp_real))
    AND EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real))::INTEGER / 60 > COALESCE(ft.duracion_pausa_minutos, 40);
END;
$$;

-- Combined function remains the same but ensure search_path
CREATE OR REPLACE FUNCTION public.recalcular_incidencias_empleado(p_empleado_id UUID, p_fecha_desde DATE DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tardios_antes INTEGER;
  v_tardios_despues INTEGER;
  v_pausas_antes INTEGER;
  v_pausas_despues INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_tardios_antes FROM public.fichajes_tardios WHERE empleado_id = p_empleado_id;
  SELECT COUNT(*) INTO v_pausas_antes FROM public.fichajes_pausas_excedidas WHERE empleado_id = p_empleado_id;

  PERFORM public.recalcular_fichajes_tardios_empleado(p_empleado_id, p_fecha_desde);
  PERFORM public.recalcular_pausas_excedidas_empleado(p_empleado_id, p_fecha_desde);

  SELECT COUNT(*) INTO v_tardios_despues FROM public.fichajes_tardios WHERE empleado_id = p_empleado_id;
  SELECT COUNT(*) INTO v_pausas_despues FROM public.fichajes_pausas_excedidas WHERE empleado_id = p_empleado_id;

  RETURN jsonb_build_object(
    'success', true,
    'fichajes_tardios', jsonb_build_object('antes', v_tardios_antes, 'despues', v_tardios_despues),
    'pausas_excedidas', jsonb_build_object('antes', v_pausas_antes, 'despues', v_pausas_despues)
  );
END;
$$;