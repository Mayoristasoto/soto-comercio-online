ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS obra_social text,
  ADD COLUMN IF NOT EXISTS obra_social_desde date;

INSERT INTO public.categorias_justificacion_asistencia (nombre, color, es_justificada, frecuente, activa, orden)
SELECT 'Día gremio', '#7c3aed', true, true, true, 103
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias_justificacion_asistencia WHERE nombre = 'Día gremio'
);