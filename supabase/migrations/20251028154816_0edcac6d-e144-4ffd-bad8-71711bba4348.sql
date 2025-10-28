-- Create function to detect break time excesses
CREATE OR REPLACE FUNCTION detectar_exceso_pausa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pausa_inicio_record RECORD;
  turno_record RECORD;
  duracion_real_minutos INTEGER;
  exceso_minutos INTEGER;
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
    AND DATE(f.timestamp_real) = DATE(NEW.timestamp_real)
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
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(NEW.timestamp_real))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(NEW.timestamp_real))
  LIMIT 1;

  -- If no shift found or no break duration configured, skip
  IF NOT FOUND OR turno_record.duracion_pausa_minutos IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate actual break duration in minutes
  duracion_real_minutos := EXTRACT(EPOCH FROM (
    NEW.timestamp_real - pausa_inicio_record.hora_inicio
  )) / 60;

  -- Calculate excess minutes
  exceso_minutos := duracion_real_minutos - turno_record.duracion_pausa_minutos;

  -- If there's an excess, record it
  IF exceso_minutos > 0 THEN
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
      DATE(NEW.timestamp_real),
      pausa_inicio_record.hora_inicio::TIME,
      NEW.timestamp_real::TIME,
      duracion_real_minutos,
      turno_record.duracion_pausa_minutos,
      exceso_minutos,
      turno_record.turno_id
    );
    
    -- Log for debugging
    RAISE LOG 'Exceso de pausa detectado: empleado %, duración real: % min, permitido: % min, exceso: % min',
      NEW.empleado_id, duracion_real_minutos, turno_record.duracion_pausa_minutos, exceso_minutos;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on fichajes table
DROP TRIGGER IF EXISTS trigger_detectar_exceso_pausa ON fichajes;

CREATE TRIGGER trigger_detectar_exceso_pausa
  AFTER INSERT ON fichajes
  FOR EACH ROW
  EXECUTE FUNCTION detectar_exceso_pausa();

COMMENT ON FUNCTION detectar_exceso_pausa() IS 'Detecta automáticamente cuando un empleado excede su tiempo de pausa permitido';
COMMENT ON TRIGGER trigger_detectar_exceso_pausa ON fichajes IS 'Se ejecuta después de insertar un fichaje para detectar excesos de pausa';