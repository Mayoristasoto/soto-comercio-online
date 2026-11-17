ALTER TABLE public.candidatos ADD COLUMN IF NOT EXISTS dni text, ADD COLUMN IF NOT EXISTS localidad text, ADD COLUMN IF NOT EXISTS consentimiento_at timestamptz;

CREATE TABLE public.ats_busquedas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  puesto_id uuid REFERENCES public.reclutamiento_puestos(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'abierta',
  descripcion text,
  requisitos text,
  publica boolean NOT NULL DEFAULT true,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ats_criterios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  busqueda_id uuid NOT NULL REFERENCES public.ats_busquedas(id) ON DELETE CASCADE,
  criterio text NOT NULL,
  descripcion text,
  peso numeric NOT NULL DEFAULT 1,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ats_postulaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  busqueda_id uuid REFERENCES public.ats_busquedas(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'nuevo',
  origen text NOT NULL DEFAULT 'manual',
  cv_path text,
  cv_nombre text,
  mensaje text,
  score numeric,
  evaluado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ats_evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  postulacion_id uuid NOT NULL REFERENCES public.ats_postulaciones(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  criterios jsonb NOT NULL DEFAULT '[]',
  experiencia jsonb NOT NULL DEFAULT '[]',
  fortalezas jsonb NOT NULL DEFAULT '[]',
  a_verificar jsonb NOT NULL DEFAULT '[]',
  preguntas jsonb NOT NULL DEFAULT '[]',
  resumen text,
  datos_extraidos jsonb,
  modelo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ats_observaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  postulacion_id uuid NOT NULL REFERENCES public.ats_postulaciones(id) ON DELETE CASCADE,
  autor_id uuid DEFAULT public.current_empleado_id(),
  nota text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ats_postulaciones(busqueda_id);
CREATE INDEX ON public.ats_postulaciones(candidato_id);
CREATE INDEX ON public.ats_evaluaciones(postulacion_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ats_busquedas, public.ats_criterios, public.ats_postulaciones, public.ats_evaluaciones, public.ats_observaciones TO authenticated;
GRANT ALL ON public.ats_busquedas, public.ats_criterios, public.ats_postulaciones, public.ats_evaluaciones, public.ats_observaciones TO service_role;

ALTER TABLE public.ats_busquedas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_criterios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_observaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ats rrhh" ON public.ats_busquedas FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE POLICY "ats rrhh" ON public.ats_criterios FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE POLICY "ats rrhh" ON public.ats_postulaciones FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE POLICY "ats rrhh" ON public.ats_evaluaciones FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE POLICY "ats rrhh" ON public.ats_observaciones FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());

CREATE TRIGGER ats_busq_upd BEFORE UPDATE ON public.ats_busquedas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER ats_post_upd BEFORE UPDATE ON public.ats_postulaciones FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.ats_busquedas_publicas()
RETURNS TABLE(id uuid, titulo text, descripcion text, requisitos text, sucursal text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT b.id, b.titulo, b.descripcion, b.requisitos, s.nombre
  FROM ats_busquedas b LEFT JOIN sucursales s ON s.id=b.sucursal_id
  WHERE b.estado='abierta' AND b.publica ORDER BY b.created_at DESC
$$;
GRANT EXECUTE ON FUNCTION public.ats_busquedas_publicas() TO anon, authenticated;