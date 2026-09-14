ALTER TABLE public.gondolas_v2 ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;
UPDATE public.gondolas_v2 SET sucursal_id = '9682b6cf-f904-4497-918c-d0c9c061b9ec'::uuid WHERE sucursal_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_gondolas_v2_sucursal ON public.gondolas_v2(sucursal_id);