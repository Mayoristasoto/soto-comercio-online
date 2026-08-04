ALTER TABLE public.planificacion_semanal
  ADD COLUMN IF NOT EXISTS aprobada_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS aprobada_por uuid NULL,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text NULL;