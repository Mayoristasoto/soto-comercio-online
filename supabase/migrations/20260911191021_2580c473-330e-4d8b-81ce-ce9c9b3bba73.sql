-- PLANOS
CREATE TABLE public.recorrido_planos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ancho NUMERIC NOT NULL DEFAULT 1000,
  alto NUMERIC NOT NULL DEFAULT 700,
  usa_gondolas BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrido_planos TO authenticated;
GRANT ALL ON public.recorrido_planos TO service_role;
ALTER TABLE public.recorrido_planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_select" ON public.recorrido_planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "planos_admin_all" ON public.recorrido_planos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

-- ZONAS
CREATE TABLE public.recorrido_zonas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.recorrido_planos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 120,
  height NUMERIC NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrido_zonas TO authenticated;
GRANT ALL ON public.recorrido_zonas TO service_role;
ALTER TABLE public.recorrido_zonas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zonas_select" ON public.recorrido_zonas FOR SELECT TO authenticated USING (true);
CREATE POLICY "zonas_admin_all" ON public.recorrido_zonas FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

-- CRITERIOS
CREATE TABLE public.recorrido_criterios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  obligatorio BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrido_criterios TO authenticated;
GRANT ALL ON public.recorrido_criterios TO service_role;
ALTER TABLE public.recorrido_criterios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "criterios_select" ON public.recorrido_criterios FOR SELECT TO authenticated USING (true);
CREATE POLICY "criterios_admin_all" ON public.recorrido_criterios FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

-- RECORRIDOS
CREATE TABLE public.recorridos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES public.recorrido_planos(id) ON DELETE SET NULL,
  titulo TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  responsable_id UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  created_by UUID,
  estado TEXT NOT NULL DEFAULT 'borrador',
  observaciones_generales TEXT,
  cerrado_at TIMESTAMPTZ,
  cerrado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorridos TO authenticated;
GRANT ALL ON public.recorridos TO service_role;
ALTER TABLE public.recorridos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recorridos_admin_all" ON public.recorridos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "recorridos_gerente_select" ON public.recorridos FOR SELECT TO authenticated USING (public.is_gerente_de_sucursal(sucursal_id));
CREATE POLICY "recorridos_gerente_insert" ON public.recorridos FOR INSERT TO authenticated WITH CHECK (public.is_gerente_de_sucursal(sucursal_id));
CREATE POLICY "recorridos_gerente_update" ON public.recorridos FOR UPDATE TO authenticated USING (public.is_gerente_de_sucursal(sucursal_id)) WITH CHECK (public.is_gerente_de_sucursal(sucursal_id));

-- HALLAZGOS
CREATE TABLE public.recorrido_hallazgos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recorrido_id UUID NOT NULL REFERENCES public.recorridos(id) ON DELETE CASCADE,
  zona_id UUID REFERENCES public.recorrido_zonas(id) ON DELETE SET NULL,
  zona_nombre TEXT,
  criterio_id UUID REFERENCES public.recorrido_criterios(id) ON DELETE SET NULL,
  criterio_nombre TEXT,
  estado public.checklist_estado_item,
  punto_x NUMERIC,
  punto_y NUMERIC,
  observaciones TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrido_hallazgos TO authenticated;
GRANT ALL ON public.recorrido_hallazgos TO service_role;
ALTER TABLE public.recorrido_hallazgos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hallazgos_admin_all" ON public.recorrido_hallazgos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "hallazgos_gerente_all" ON public.recorrido_hallazgos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recorridos r WHERE r.id = recorrido_id AND public.is_gerente_de_sucursal(r.sucursal_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recorridos r WHERE r.id = recorrido_id AND public.is_gerente_de_sucursal(r.sucursal_id)));

-- FOTOS
CREATE TABLE public.recorrido_hallazgo_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hallazgo_id UUID NOT NULL REFERENCES public.recorrido_hallazgos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrido_hallazgo_fotos TO authenticated;
GRANT ALL ON public.recorrido_hallazgo_fotos TO service_role;
ALTER TABLE public.recorrido_hallazgo_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hallazgo_fotos_admin_all" ON public.recorrido_hallazgo_fotos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

-- TRIGGERS updated_at
CREATE TRIGGER trg_recorrido_planos_updated BEFORE UPDATE ON public.recorrido_planos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_recorrido_zonas_updated BEFORE UPDATE ON public.recorrido_zonas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_recorrido_criterios_updated BEFORE UPDATE ON public.recorrido_criterios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_recorridos_updated BEFORE UPDATE ON public.recorridos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_recorrido_hallazgos_updated BEFORE UPDATE ON public.recorrido_hallazgos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_recorrido_zonas_plano ON public.recorrido_zonas(plano_id);
CREATE INDEX idx_recorridos_sucursal_fecha ON public.recorridos(sucursal_id, fecha_hora DESC);
CREATE INDEX idx_recorrido_hallazgos_recorrido ON public.recorrido_hallazgos(recorrido_id);
CREATE INDEX idx_recorrido_hallazgo_fotos_hallazgo ON public.recorrido_hallazgo_fotos(hallazgo_id);