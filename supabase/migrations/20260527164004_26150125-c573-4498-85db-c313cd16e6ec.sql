
ALTER TABLE public.entregas_items 
  ADD COLUMN IF NOT EXISTS plantilla_id uuid REFERENCES public.plantillas_elementos(id) ON DELETE SET NULL;

ALTER TABLE public.entregas_empleado 
  ADD COLUMN IF NOT EXISTS comprobante_impreso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comprobante_impreso_at timestamptz;
