-- Fix timezone issue in late arrival detection
-- The problem: timestamp_real is stored in UTC, but hora_entrada is in Argentina time
-- This causes a 3-hour offset when comparing times

-- Drop and recreate the function with proper timezone handling
DROP FUNCTION IF EXISTS public.detectar_fichaje_tardio() CASCADE;

CREATE OR REPLACE FUNCTION public.detectar_fichaje_tardio()
RETURNS TRIGGER AS $$
DECLARE
  turno_empleado RECORD;
  minutos_tarde INTEGER;
  hora_real_argentina TIME;
BEGIN
  -- Only process entrada type fichajes
  IF NEW.tipo != 'entrada' THEN
    RETURN NEW;
  END IF;

  -- Get employee's shift for today
  SELECT 
    ft.hora_entrada,
    ft.tolerancia_entrada_minutos
  INTO turno_empleado
  FROM public.empleado_turnos et
  JOIN public.fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = NEW.empleado_id
    AND et.activo = true
    AND ft.activo = true
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE)
    AND et.fecha_inicio <= CURRENT_DATE
  LIMIT 1;

  -- If no shift found, skip processing
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- CRITICAL FIX: Convert UTC timestamp to Argentina timezone before extracting TIME
  -- This ensures we compare times in the same timezone
  hora_real_argentina := (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;

  -- Calculate minutes late using the corrected time
  minutos_tarde := EXTRACT(EPOCH FROM (
    hora_real_argentina - 
    (turno_empleado.hora_entrada + COALESCE(turno_empleado.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute')
  )) / 60;

  -- If employee is late, record it
  IF minutos_tarde > 0 THEN
    INSERT INTO public.fichajes_tardios (
      empleado_id,
      fecha_fichaje,
      hora_programada,
      hora_real,
      minutos_retraso,
      observaciones
    ) VALUES (
      NEW.empleado_id,
      (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE,
      turno_empleado.hora_entrada,
      hora_real_argentina,
      ROUND(minutos_tarde),
      'Llegada detectada automáticamente'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_detectar_fichaje_tardio ON public.fichajes;

CREATE TRIGGER trigger_detectar_fichaje_tardio
  AFTER INSERT ON public.fichajes
  FOR EACH ROW
  EXECUTE FUNCTION public.detectar_fichaje_tardio();

-- Update existing late arrival records to use correct timezone
-- This will recalculate all late arrivals from today
DO $$
DECLARE
  fichaje_record RECORD;
  turno_empleado RECORD;
  minutos_tarde INTEGER;
  hora_real_argentina TIME;
BEGIN
  -- Delete all late arrival records from today (we'll recalculate them)
  DELETE FROM public.fichajes_tardios 
  WHERE fecha_fichaje = CURRENT_DATE;

  -- Recalculate late arrivals for today
  FOR fichaje_record IN 
    SELECT id, empleado_id, timestamp_real, tipo
    FROM public.fichajes
    WHERE DATE(timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = CURRENT_DATE
      AND tipo = 'entrada'
      AND estado = 'valido'
  LOOP
    -- Get employee's shift
    SELECT 
      ft.hora_entrada,
      ft.tolerancia_entrada_minutos
    INTO turno_empleado
    FROM public.empleado_turnos et
    JOIN public.fichado_turnos ft ON et.turno_id = ft.id
    WHERE et.empleado_id = fichaje_record.empleado_id
      AND et.activo = true
      AND ft.activo = true
      AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE)
      AND et.fecha_inicio <= CURRENT_DATE
    LIMIT 1;

    IF FOUND THEN
      -- Convert to Argentina timezone
      hora_real_argentina := (fichaje_record.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;

      -- Calculate minutes late
      minutos_tarde := EXTRACT(EPOCH FROM (
        hora_real_argentina - 
        (turno_empleado.hora_entrada + COALESCE(turno_empleado.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute')
      )) / 60;

      -- If late, insert record
      IF minutos_tarde > 0 THEN
        INSERT INTO public.fichajes_tardios (
          empleado_id,
          fecha_fichaje,
          hora_programada,
          hora_real,
          minutos_retraso,
          observaciones
        ) VALUES (
          fichaje_record.empleado_id,
          (fichaje_record.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE,
          turno_empleado.hora_entrada,
          hora_real_argentina,
          ROUND(minutos_tarde),
          'Recalculado con timezone correcto'
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Add comment to document the fix
COMMENT ON FUNCTION public.detectar_fichaje_tardio() IS 
'Detecta llegadas tarde convirtiendo timestamps UTC a zona horaria de Argentina (UTC-3) antes de comparar con horarios de turno.
Corregido el 2025-01-30 para solucionar problema de desfase de 3 horas.';