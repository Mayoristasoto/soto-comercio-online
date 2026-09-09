CREATE TABLE public.checklist_control_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.checklist_controles(id) ON DELETE CASCADE,
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  empleado_nombre text,
  actividad text NOT NULL,
  registrado_at timestamptz NOT NULL DEFAULT now(),
  origen_asignacion text NOT NULL DEFAULT 'sin_definir',
  asignado_por_id uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  asignado_por_nombre text,
  observaciones text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_actividades_control ON public.checklist_control_actividades(control_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_control_actividades TO authenticated;
GRANT ALL ON public.checklist_control_actividades TO service_role;

ALTER TABLE public.checklist_control_actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RRHH gestiona actividades de control"
ON public.checklist_control_actividades
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_rrhh'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE TRIGGER trg_checklist_actividades_updated_at
BEFORE UPDATE ON public.checklist_control_actividades
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
