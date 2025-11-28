-- Agregar campo de horas de jornada estándar a empleados
ALTER TABLE empleados 
ADD COLUMN IF NOT EXISTS horas_jornada_estandar numeric DEFAULT 8 
CHECK (horas_jornada_estandar IN (6, 8));

COMMENT ON COLUMN empleados.horas_jornada_estandar IS 'Horas de jornada laboral estándar del empleado (6 u 8 horas)';

-- Crear índice para mejorar consultas de reportes
CREATE INDEX IF NOT EXISTS idx_horas_trabajadas_empleado_fecha 
ON horas_trabajadas_registro(empleado_id, fecha DESC);