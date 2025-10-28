-- Add duracion_pausa_minutos to fichado_turnos table
ALTER TABLE fichado_turnos 
ADD COLUMN IF NOT EXISTS duracion_pausa_minutos integer DEFAULT 60;

COMMENT ON COLUMN fichado_turnos.duracion_pausa_minutos IS 'Duración máxima permitida de pausa en minutos';