-- Corregir función detectar_exceso_pausa para guardar horas en timezone correcto
CREATE OR REPLACE FUNCTION public.detectar_exceso_pausa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pausa_inicio_record RECORD;
  turno_record RECORD;
  duracion_real_minutos INTEGER;
  exceso_minutos INTEGER;
  hora_inicio_arg TIME;
  hora_fin_arg TIME;
BEGIN
  -- Only process pausa_fin type fichajes
  IF NEW.tipo != 'pausa_fin' THEN
    RETURN NEW;
  END IF;

  -- Find the corresponding pausa_inicio for today
  SELECT 
    f.id,
    f.timestamp_real as hora_inicio,
    f.empleado_id
  INTO pausa_inicio_record
  FROM fichajes f
  WHERE f.empleado_id = NEW.empleado_id
    AND DATE(f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')
    AND f.tipo = 'pausa_inicio'
    AND f.estado = 'valido'
    AND f.timestamp_real < NEW.timestamp_real
  ORDER BY f.timestamp_real DESC
  LIMIT 1;

  -- If no pausa_inicio found, skip
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get employee's shift configuration for today
  SELECT 
    ft.duracion_pausa_minutos,
    ft.id as turno_id
  INTO turno_record
  FROM empleado_turnos et
  JOIN fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = NEW.empleado_id
    AND et.activo = true
    AND ft.activo = true
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
  LIMIT 1;

  -- If no shift found or no break duration configured, skip
  IF NOT FOUND OR turno_record.duracion_pausa_minutos IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convert timestamps to Argentina timezone first, then extract TIME
  hora_inicio_arg := (pausa_inicio_record.hora_inicio AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  hora_fin_arg := (NEW.timestamp_real AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;

  -- Calculate actual break duration in minutes
  duracion_real_minutos := ROUND(EXTRACT(EPOCH FROM (
    NEW.timestamp_real - pausa_inicio_record.hora_inicio
  )) / 60);

  -- Calculate excess minutes
  exceso_minutos := duracion_real_minutos - turno_record.duracion_pausa_minutos;

  -- Registrar excesos desde 1 minuto en adelante
  IF exceso_minutos >= 1 THEN
    INSERT INTO fichajes_pausas_excedidas (
      empleado_id,
      fecha_fichaje,
      hora_inicio_pausa,
      hora_fin_pausa,
      duracion_minutos,
      duracion_permitida_minutos,
      minutos_exceso,
      turno_id
    ) VALUES (
      NEW.empleado_id,
      DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'),
      hora_inicio_arg,
      hora_fin_arg,
      duracion_real_minutos,
      turno_record.duracion_pausa_minutos,
      exceso_minutos,
      turno_record.turno_id
    );
    
    RAISE LOG 'Exceso de pausa detectado: empleado %, duración real: % min, permitido: % min, exceso: % min',
      NEW.empleado_id, duracion_real_minutos, turno_record.duracion_pausa_minutos, exceso_minutos;
  END IF;

  RETURN NEW;
END;
$$;

-- Actualizar función recalcular_pausas_excedidas_empleado con timezone correcto
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

  -- Eliminar registros existentes para recalcular
  DELETE FROM public.fichajes_pausas_excedidas
  WHERE empleado_id = p_empleado_id
    AND fecha_fichaje >= v_fecha_desde;

  -- Insertar solo pausas que realmente excedieron el tiempo permitido
  INSERT INTO public.fichajes_pausas_excedidas (
    empleado_id,
    fecha_fichaje,
    hora_inicio_pausa,
    hora_fin_pausa,
    duracion_minutos,
    duracion_permitida_minutos,
    minutos_exceso,
    turno_id
  )
  SELECT 
    f_fin.empleado_id,
    DATE(f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') AS fecha_fichaje,
    (f_inicio.timestamp_real AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME AS hora_inicio_pausa,
    (f_fin.timestamp_real AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME AS hora_fin_pausa,
    ROUND(EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real)) / 60) AS duracion_minutos,
    ft.duracion_pausa_minutos,
    ROUND(EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real)) / 60) - ft.duracion_pausa_minutos AS minutos_exceso,
    ft.id
  FROM public.fichajes f_fin
  JOIN LATERAL (
    SELECT f.timestamp_real, f.empleado_id
    FROM public.fichajes f
    WHERE f.empleado_id = f_fin.empleado_id
      AND f.tipo = 'pausa_inicio'
      AND f.estado = 'valido'
      AND DATE(f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = DATE(f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')
      AND f.timestamp_real < f_fin.timestamp_real
    ORDER BY f.timestamp_real DESC
    LIMIT 1
  ) f_inicio ON true
  JOIN public.empleado_turnos et ON et.empleado_id = f_fin.empleado_id AND et.activo = true
  JOIN public.fichado_turnos ft ON ft.id = et.turno_id AND ft.activo = true
  WHERE f_fin.empleado_id = p_empleado_id
    AND f_fin.tipo = 'pausa_fin'
    AND f_fin.estado = 'valido'
    AND DATE(f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') >= v_fecha_desde
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(f_fin.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
    AND ft.duracion_pausa_minutos IS NOT NULL
    -- Registrar excesos desde 1 minuto
    AND (ROUND(EXTRACT(EPOCH FROM (f_fin.timestamp_real - f_inicio.timestamp_real)) / 60) - ft.duracion_pausa_minutos) >= 1;
END;
$$;