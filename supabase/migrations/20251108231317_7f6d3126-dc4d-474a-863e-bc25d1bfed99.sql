-- Agregar campo para horarios específicos por día de la semana
ALTER TABLE public.fichado_turnos 
ADD COLUMN horarios_por_dia jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.fichado_turnos.horarios_por_dia IS 'Horarios específicos por día de la semana. Formato: {"1": {"hora_entrada": "09:00", "hora_salida": "18:00"}, "6": {"hora_entrada": "09:00", "hora_salida": "14:00"}}. Las claves son números de día (0=Domingo, 1=Lunes, ..., 6=Sábado)';