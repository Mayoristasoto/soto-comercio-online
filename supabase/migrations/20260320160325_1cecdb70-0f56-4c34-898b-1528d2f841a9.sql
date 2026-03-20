
-- Add F931 summary columns to periodos_contables for cross-validation
ALTER TABLE public.periodos_contables
  ADD COLUMN IF NOT EXISTS f931_cant_empleados integer,
  ADD COLUMN IF NOT EXISTS f931_remuneracion_total numeric,
  ADD COLUMN IF NOT EXISTS f931_aportes_ss numeric,
  ADD COLUMN IF NOT EXISTS f931_contribuciones_ss numeric,
  ADD COLUMN IF NOT EXISTS f931_aportes_os numeric,
  ADD COLUMN IF NOT EXISTS f931_contribuciones_os numeric,
  ADD COLUMN IF NOT EXISTS f931_lrt numeric,
  ADD COLUMN IF NOT EXISTS f931_importado_at timestamptz;
