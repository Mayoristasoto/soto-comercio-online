CREATE TYPE public.checklist_estado_item AS ENUM ('cumple', 'parcial', 'no_cumple');

-- PLANTILLAS
CREATE TABLE public.checklist_plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_plantillas TO authenticated;
GRANT ALL ON public.checklist_plantillas TO service_role;
ALTER TABLE public.checklist_plantillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona plantillas checklist" ON public.checklist_plantillas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.checklist_plantilla_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id uuid NOT NULL REFERENCES public.checklist_plantillas(id) ON DELETE CASCADE,
  texto text NOT NULL,
  seccion text,
  orden integer NOT NULL DEFAULT 0,
  obligatorio boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_plantilla_items_plantilla ON public.checklist_plantilla_items(plantilla_id, orden);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_plantilla_items TO authenticated;
GRANT ALL ON public.checklist_plantilla_items TO service_role;
ALTER TABLE public.checklist_plantilla_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona items de plantilla" ON public.checklist_plantilla_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

-- CONTROLES
CREATE TABLE public.checklist_controles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
  plantilla_id uuid REFERENCES public.checklist_plantillas(id) ON DELETE SET NULL,
  titulo text,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  responsable_id uuid,
  estado text NOT NULL DEFAULT 'borrador',
  observaciones_generales text,
  cerrado_at timestamptz,
  cerrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_controles_sucursal_fecha ON public.checklist_controles(sucursal_id, fecha_hora DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_controles TO authenticated;
GRANT ALL ON public.checklist_controles TO service_role;
ALTER TABLE public.checklist_controles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona controles checklist" ON public.checklist_controles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.checklist_control_encargados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.checklist_controles(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (control_id, empleado_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_control_encargados TO authenticated;
GRANT ALL ON public.checklist_control_encargados TO service_role;
ALTER TABLE public.checklist_control_encargados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona encargados de control" ON public.checklist_control_encargados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.checklist_control_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id uuid NOT NULL REFERENCES public.checklist_controles(id) ON DELETE CASCADE,
  texto text NOT NULL,
  seccion text,
  orden integer NOT NULL DEFAULT 0,
  estado public.checklist_estado_item,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_control_items_control ON public.checklist_control_items(control_id, orden);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_control_items TO authenticated;
GRANT ALL ON public.checklist_control_items TO service_role;
ALTER TABLE public.checklist_control_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona items de control" ON public.checklist_control_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.checklist_item_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.checklist_control_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_item_fotos_item ON public.checklist_item_fotos(item_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_item_fotos TO authenticated;
GRANT ALL ON public.checklist_item_fotos TO service_role;
ALTER TABLE public.checklist_item_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona fotos de checklist" ON public.checklist_item_fotos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

-- Triggers updated_at
CREATE TRIGGER trg_checklist_plantillas_updated BEFORE UPDATE ON public.checklist_plantillas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_checklist_plantilla_items_updated BEFORE UPDATE ON public.checklist_plantilla_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_checklist_controles_updated BEFORE UPDATE ON public.checklist_controles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_checklist_control_items_updated BEFORE UPDATE ON public.checklist_control_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();