-- Agregar campo para almacenar URLs de fotos de evidencia en las tareas
ALTER TABLE public.tareas 
ADD COLUMN fotos_evidencia TEXT[] DEFAULT ARRAY[]::TEXT[];