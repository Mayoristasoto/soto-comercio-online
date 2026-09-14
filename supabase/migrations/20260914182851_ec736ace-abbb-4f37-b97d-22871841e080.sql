ALTER TABLE public.recorrido_criterios
  ADD COLUMN IF NOT EXISTS tipos_aplica text[] NOT NULL DEFAULT ARRAY['gondola','puntera','exhibidor_impulso','cartel_exterior']::text[];

ALTER TABLE public.recorrido_puntos
  ADD COLUMN IF NOT EXISTS tipo_espacio text;