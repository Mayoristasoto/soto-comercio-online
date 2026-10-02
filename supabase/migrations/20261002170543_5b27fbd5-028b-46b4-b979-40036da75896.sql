CREATE TABLE public.whatsapp_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen text NOT NULL,
  referencia_id text,
  numero text NOT NULL,
  nombre text,
  mensaje text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  error text,
  respuesta jsonb,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_envios TO authenticated;
GRANT ALL ON public.whatsapp_envios TO service_role;
ALTER TABLE public.whatsapp_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH ve envios" ON public.whatsapp_envios FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin_rrhh'::user_role));
CREATE INDEX ON public.whatsapp_envios (created_at DESC);