CREATE TABLE public.novedades_estudio_borradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'borrador',
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  filas_manuales jsonb NOT NULL DEFAULT '[]'::jsonb,
  ocultos jsonb NOT NULL DEFAULT '[]'::jsonb,
  anotaciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.novedades_estudio_borradores TO authenticated;
GRANT ALL ON public.novedades_estudio_borradores TO service_role;
ALTER TABLE public.novedades_estudio_borradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona borradores estudio" ON public.novedades_estudio_borradores
FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_nov_estudio_upd BEFORE UPDATE ON public.novedades_estudio_borradores
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();