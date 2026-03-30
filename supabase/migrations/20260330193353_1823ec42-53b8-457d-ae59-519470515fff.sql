
ALTER TABLE public.tablero_tarjetas 
ADD COLUMN es_obligatoria boolean NOT NULL DEFAULT false,
ADD COLUMN tarea_id uuid REFERENCES public.tareas(id) ON DELETE SET NULL;
