CREATE TABLE public.plantillas_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  contenido_html text NOT NULL,
  ciudad_default text NOT NULL DEFAULT 'Mar del Plata',
  activa boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plantillas_documentos TO authenticated;
GRANT ALL ON public.plantillas_documentos TO service_role;

ALTER TABLE public.plantillas_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read templates"
  ON public.plantillas_documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert templates"
  ON public.plantillas_documentos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "Admins can update templates"
  ON public.plantillas_documentos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "Admins can delete templates"
  ON public.plantillas_documentos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE TRIGGER trg_plantillas_documentos_updated_at
  BEFORE UPDATE ON public.plantillas_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plantillas_documentos (codigo, nombre, descripcion, contenido_html) VALUES
('vacaciones_otorgamiento',
 'Constancia de Otorgamiento de Vacaciones',
 'Se imprime al aprobar las vacaciones, para que el empleado tome conocimiento del período otorgado.',
 '<p style="text-align:right;">{{ciudad}}, {{fecha_hoy}}.</p>
<p style="margin-top:24px;">Por medio de la presente, tomo conocimiento de las vacaciones que me fueran otorgadas desde el <strong>{{fecha_inicio}}</strong> hasta el <strong>{{fecha_fin}}</strong>, inclusive.</p>
<p>Por lo tanto, me reincorporaré a mis tareas el <strong>{{fecha_reintegro}}</strong>.</p>'),
('vacaciones_goce',
 'Constancia de Goce de Vacaciones',
 'Se imprime cuando el empleado retoma tareas, para dejar constancia del goce efectivo del período.',
 '<p style="text-align:right;">{{ciudad}}, {{fecha_hoy}}.</p>
<p style="margin-top:24px;">Por medio de la presente, dejo constancia de haber gozado mis vacaciones desde el <strong>{{fecha_inicio}}</strong> hasta el <strong>{{fecha_fin}}</strong>, inclusive. Habiendo retomado mis tareas en el día de la fecha.</p>');