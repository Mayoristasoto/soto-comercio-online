ALTER TABLE public.ats_postulaciones ADD COLUMN IF NOT EXISTS lote text;
CREATE INDEX IF NOT EXISTS ats_postulaciones_lote_idx ON public.ats_postulaciones(lote);