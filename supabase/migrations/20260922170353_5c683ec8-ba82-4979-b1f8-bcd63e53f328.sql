CREATE TABLE public.alertas_rrhh (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  titulo text NOT NULL,
  detalle text,
  enlace text,
  clave text NOT NULL UNIQUE,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  leida_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_rrhh TO authenticated;
GRANT ALL ON public.alertas_rrhh TO service_role;
ALTER TABLE public.alertas_rrhh ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_rrhh gestiona alertas" ON public.alertas_rrhh FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));