-- Agregar 'gozadas' al enum de estados de solicitudes de vacaciones
ALTER TYPE solicitud_estado ADD VALUE IF NOT EXISTS 'gozadas';

-- Crear función para actualizar automáticamente estado a gozadas
CREATE OR REPLACE FUNCTION actualizar_vacaciones_gozadas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar solicitudes aprobadas cuya fecha de fin ya pasó
  UPDATE solicitudes_vacaciones
  SET estado = 'gozadas'
  WHERE estado = 'aprobada'
  AND fecha_fin < CURRENT_DATE;
END;
$$;

-- Crear trigger para actualizar al leer solicitudes
CREATE OR REPLACE FUNCTION check_vacaciones_gozadas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la solicitud está aprobada y la fecha de fin ya pasó, marcarla como gozada
  IF NEW.estado = 'aprobada' AND NEW.fecha_fin < CURRENT_DATE THEN
    NEW.estado := 'gozadas';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta antes de INSERT y UPDATE
DROP TRIGGER IF EXISTS trigger_check_vacaciones_gozadas ON solicitudes_vacaciones;
CREATE TRIGGER trigger_check_vacaciones_gozadas
  BEFORE INSERT OR UPDATE ON solicitudes_vacaciones
  FOR EACH ROW
  EXECUTE FUNCTION check_vacaciones_gozadas();

-- Ejecutar una vez la función para actualizar registros existentes
SELECT actualizar_vacaciones_gozadas();