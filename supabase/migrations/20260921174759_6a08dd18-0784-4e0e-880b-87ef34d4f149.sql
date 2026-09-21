ALTER TABLE public.checklist_control_actividades
  ADD COLUMN IF NOT EXISTS recorrido_id uuid REFERENCES public.recorridos(id) ON DELETE CASCADE,
  ALTER COLUMN control_id DROP NOT NULL;

ALTER TABLE public.checklist_control_actividades
  ADD CONSTRAINT checklist_control_actividades_origen_chk
  CHECK (control_id IS NOT NULL OR recorrido_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_cca_recorrido ON public.checklist_control_actividades(recorrido_id);