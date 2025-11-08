-- Agregar columna dias_semana a fichado_turnos para especificar qué días aplica cada turno
-- Array de integers donde 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
ALTER TABLE public.fichado_turnos 
ADD COLUMN IF NOT EXISTS dias_semana integer[] DEFAULT ARRAY[1,2,3,4,5,6]; -- Por defecto Lunes a Sábado

COMMENT ON COLUMN public.fichado_turnos.dias_semana IS 'Array de días de la semana donde aplica el turno. 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';