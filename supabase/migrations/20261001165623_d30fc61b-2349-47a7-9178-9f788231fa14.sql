CREATE TABLE public.novedades_estudio_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  texto text NOT NULL,
  destino text NOT NULL DEFAULT 'obs',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.novedades_estudio_notas TO authenticated;
GRANT ALL ON public.novedades_estudio_notas TO service_role;
ALTER TABLE public.novedades_estudio_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona notas estudio" ON public.novedades_estudio_notas FOR ALL TO authenticated
USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE INDEX idx_nov_notas_periodo ON public.novedades_estudio_notas(periodo);
CREATE TRIGGER trg_nov_notas_upd BEFORE UPDATE ON public.novedades_estudio_notas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();