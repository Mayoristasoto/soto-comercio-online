
-- Add weekly flexible frequency columns to tareas_plantillas
ALTER TABLE public.tareas_plantillas
ADD COLUMN IF NOT EXISTS veces_por_semana integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recordatorio_fin_semana boolean DEFAULT false;

-- Add plantilla_id to tareas for tracking weekly completion
ALTER TABLE public.tareas
ADD COLUMN IF NOT EXISTS plantilla_id uuid DEFAULT NULL REFERENCES public.tareas_plantillas(id) ON DELETE SET NULL;

-- Add index for efficient weekly lookups
CREATE INDEX IF NOT EXISTS idx_tareas_plantilla_id ON public.tareas(plantilla_id);

-- Add check constraint for veces_por_semana range
ALTER TABLE public.tareas_plantillas
ADD CONSTRAINT chk_veces_por_semana CHECK (veces_por_semana IS NULL OR (veces_por_semana >= 1 AND veces_por_semana <= 7));
