ALTER TABLE public.recorrido_zonas ADD COLUMN IF NOT EXISTS gondola_ref text;
ALTER TABLE public.recorrido_zonas ADD COLUMN IF NOT EXISTS rotation numeric NOT NULL DEFAULT 0;
ALTER TABLE public.recorrido_puntos ADD COLUMN IF NOT EXISTS rotation numeric NOT NULL DEFAULT 0;

UPDATE public.recorrido_zonas z
SET gondola_ref = p.gondola_ref
FROM public.recorrido_puntos p
WHERE p.zona_id = z.id AND z.gondola_ref IS NULL AND p.gondola_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS recorrido_zonas_plano_gondola_idx ON public.recorrido_zonas (plano_id, gondola_ref);