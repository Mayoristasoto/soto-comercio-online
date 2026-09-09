CREATE TABLE public.encuesta_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  titulo text NOT NULL DEFAULT 'Encuesta de satisfacción',
  bienvenida text NOT NULL DEFAULT 'Nos gustaría conocer tu experiencia en el salón. Son solo unas preguntas.',
  agradecimiento text NOT NULL DEFAULT '¡Gracias por tu tiempo! Te enviamos un descuento para tu próxima visita.',
  pide_email boolean NOT NULL DEFAULT true,
  pide_telefono boolean NOT NULL DEFAULT true,
  telefono_obligatorio boolean NOT NULL DEFAULT false,
  descuento_texto text NOT NULL DEFAULT '10% de descuento en tu próxima compra',
  descuento_vigencia_dias integer NOT NULL DEFAULT 30,
  codigo_prefijo text NOT NULL DEFAULT 'SOTO',
  whatsapp_activo boolean NOT NULL DEFAULT false,
  whatsapp_api_url text NOT NULL DEFAULT 'https://api.mayoristasoto.online/api/messages/send',
  whatsapp_mensaje text NOT NULL DEFAULT '¡Hola {nombre}! Gracias por visitarnos y por completar la encuesta. Te dejamos tu beneficio: {descuento}. Código: {codigo} (válido hasta {vence}). ¡Te esperamos!',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT encuesta_config_singleton_uq UNIQUE (singleton)
);

GRANT SELECT ON public.encuesta_config TO authenticated;
GRANT INSERT, UPDATE ON public.encuesta_config TO authenticated;
GRANT ALL ON public.encuesta_config TO service_role;
ALTER TABLE public.encuesta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encuesta_config_read" ON public.encuesta_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "encuesta_config_write" ON public.encuesta_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh')) WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.encuesta_preguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  tipo text NOT NULL DEFAULT 'estrellas',
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  orden integer NOT NULL DEFAULT 0,
  obligatoria boolean NOT NULL DEFAULT true,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuesta_preguntas TO authenticated;
GRANT ALL ON public.encuesta_preguntas TO service_role;
ALTER TABLE public.encuesta_preguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encuesta_preguntas_read" ON public.encuesta_preguntas FOR SELECT TO authenticated USING (true);
CREATE POLICY "encuesta_preguntas_write" ON public.encuesta_preguntas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh')) WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.encuesta_respuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  control_id uuid REFERENCES public.checklist_controles(id) ON DELETE SET NULL,
  cliente_nombre text NOT NULL,
  cliente_email text,
  cliente_telefono text,
  respuestas jsonb NOT NULL DEFAULT '[]'::jsonb,
  promedio_estrellas numeric(3,2),
  comentario text,
  codigo_descuento text,
  descuento_texto text,
  descuento_vence date,
  whatsapp_estado text NOT NULL DEFAULT 'no_enviado',
  whatsapp_respuesta jsonb,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuesta_respuestas TO authenticated;
GRANT ALL ON public.encuesta_respuestas TO service_role;
ALTER TABLE public.encuesta_respuestas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encuesta_respuestas_read" ON public.encuesta_respuestas FOR SELECT TO authenticated USING (true);
CREATE POLICY "encuesta_respuestas_insert" ON public.encuesta_respuestas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "encuesta_respuestas_update" ON public.encuesta_respuestas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh')) WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "encuesta_respuestas_delete" ON public.encuesta_respuestas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE INDEX encuesta_respuestas_fecha_idx ON public.encuesta_respuestas (created_at DESC);

CREATE TRIGGER encuesta_config_updated_at BEFORE UPDATE ON public.encuesta_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.encuesta_config (singleton) VALUES (true);

INSERT INTO public.encuesta_preguntas (texto, tipo, orden) VALUES
  ('¿Cómo encontraste el salón?', 'estrellas', 0),
  ('¿Qué te pareció la atención?', 'estrellas', 1),
  ('¿Encontraste lo que buscabas?', 'si_no', 2),
  ('¿Cómo calificás los precios?', 'estrellas', 3),
  ('¿Querés dejarnos un comentario?', 'texto', 4);

UPDATE public.encuesta_preguntas SET obligatoria = false WHERE tipo = 'texto';