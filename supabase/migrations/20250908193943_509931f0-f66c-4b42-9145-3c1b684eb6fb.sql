-- Add points field to insignias table
ALTER TABLE public.insignias 
ADD COLUMN IF NOT EXISTS puntos_valor integer DEFAULT 0;

-- Update existing badges with point values
UPDATE public.insignias 
SET puntos_valor = CASE 
  WHEN nombre LIKE '%Empleado Puntual%' THEN 50
  WHEN nombre LIKE '%Mejor Vendedor%' THEN 100
  WHEN nombre LIKE '%Asistencia Perfecta%' THEN 75
  WHEN nombre LIKE '%Innovación%' THEN 80
  WHEN nombre LIKE '%Trabajo en Equipo%' THEN 60
  ELSE 25
END;