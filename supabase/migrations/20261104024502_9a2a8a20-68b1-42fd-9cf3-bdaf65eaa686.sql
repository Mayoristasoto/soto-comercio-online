CREATE TABLE public.agenda_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_empleado_id uuid NOT NULL,
  titulo text NOT NULL,
  detalle text,
  fecha_hora timestamptz NOT NULL,
  avisar_en timestamptz NOT NULL,
  avisado boolean NOT NULL DEFAULT false,
  completado boolean NOT NULL DEFAULT false,
  origen text NOT NULL DEFAULT 'telegram',
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agenda_personal_pend_idx ON public.agenda_personal (avisar_en) WHERE NOT avisado;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_personal TO authenticated;
GRANT ALL ON public.agenda_personal TO service_role;
ALTER TABLE public.agenda_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda propia" ON public.agenda_personal FOR ALL TO authenticated
USING (autor_empleado_id IN (SELECT id FROM public.empleados WHERE user_id = auth.uid()))
WITH CHECK (autor_empleado_id IN (SELECT id FROM public.empleados WHERE user_id = auth.uid()));