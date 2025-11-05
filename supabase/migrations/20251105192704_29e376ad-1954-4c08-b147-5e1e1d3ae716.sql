-- Limpiar registros incorrectos de fichajes_tardios para empleados con turno cambiado
DELETE FROM fichajes_tardios
WHERE empleado_id IN ('b29bbea0-40a1-4a57-a322-c816ed527bc8', '88b0e4b5-0355-4178-8900-bd4e0001a5d2')
  AND fecha_fichaje >= '2025-11-05'
  AND hora_programada = '07:30:00';

-- Mejorar la función recalcular_fichajes_tardios_empleado para usar timezone Argentina desde timestamp_real
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

  -- Eliminar registros existentes para recalcular
  DELETE FROM public.fichajes_tardios
  WHERE empleado_id = p_empleado_id
    AND fecha_fichaje >= v_fecha_desde;

  -- Insertar solo fichajes que realmente están tarde según el turno vigente en esa fecha
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
    'Recalculado automáticamente'
  FROM public.fichajes f
  JOIN public.empleado_turnos et ON et.empleado_id = f.empleado_id AND et.activo = true
  JOIN public.fichado_turnos ft ON ft.id = et.turno_id AND ft.activo = true
  WHERE f.empleado_id = p_empleado_id
    AND f.tipo = 'entrada'
    AND f.estado = 'valido'
    AND (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE >= v_fecha_desde
    -- CRITICAL: Verificar que el turno estaba vigente en la fecha del fichaje
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE)
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE)
    -- Solo registrar si realmente está tarde (después de hora + tolerancia)
    AND (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME > (ft.hora_entrada + COALESCE(ft.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute');
END;
$$;