CREATE TABLE public.ats_plantillas_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  texto text NOT NULL,
  predeterminada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ats_plantillas_whatsapp TO authenticated;
GRANT ALL ON public.ats_plantillas_whatsapp TO service_role;
ALTER TABLE public.ats_plantillas_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ats rrhh" ON public.ats_plantillas_whatsapp FOR ALL TO authenticated USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE UNIQUE INDEX ats_plantillas_whatsapp_una_predeterminada ON public.ats_plantillas_whatsapp (predeterminada) WHERE predeterminada;

CREATE OR REPLACE FUNCTION public.ats_plantillas_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER ats_plantillas_whatsapp_touch BEFORE UPDATE ON public.ats_plantillas_whatsapp FOR EACH ROW EXECUTE FUNCTION public.ats_plantillas_touch();

INSERT INTO public.ats_plantillas_whatsapp (nombre, texto, predeterminada)
VALUES (
  'Invitación estándar',
  COALESCE(
    (SELECT NULLIF(trim(mensaje_whatsapp), '') FROM public.entrevistas_config ORDER BY created_at LIMIT 1),
    E'Hola [Nombre], ¿cómo estás?\n\nTe contactamos de Mayorista Soto por tu postulación para [Puesto].\n\nNos gustaría coordinar una entrevista.\n\nPodés elegir directamente el día y horario que te resulte más cómodo desde el siguiente enlace:\n\n[LINK_UNICO]\n\nUna vez seleccionado, tu entrevista quedará confirmada.\n\nGracias.\nMayorista Soto'
  ),
  true
);