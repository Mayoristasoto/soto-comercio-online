-- Add dni column to empleados table
ALTER TABLE public.empleados ADD COLUMN dni TEXT;

-- Add index for dni for better performance when searching
CREATE INDEX IF NOT EXISTS idx_empleados_dni ON public.empleados(dni);