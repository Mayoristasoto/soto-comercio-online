CREATE TABLE public.notificaciones_preferencias (
  usuario_id uuid NOT NULL,
  categoria text NOT NULL,
  habilitado boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, categoria)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones_preferencias TO authenticated;
GRANT ALL ON public.notificaciones_preferencias TO service_role;
ALTER TABLE public.notificaciones_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.notificaciones_preferencias FOR ALL TO authenticated
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());