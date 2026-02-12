
ALTER TABLE public.empleados 
ADD COLUMN IF NOT EXISTS tipo_jornada text NOT NULL DEFAULT 'diaria',
ADD COLUMN IF NOT EXISTS horas_semanales_objetivo numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dias_laborales_semana integer NOT NULL DEFAULT 6;
