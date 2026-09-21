CREATE TABLE public.vacaciones_cobertura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL UNIQUE REFERENCES public.solicitudes_vacaciones(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES public.sucursales(id),
  creado_por uuid REFERENCES public.empleados(id),
  estado text NOT NULL DEFAULT 'borrador',
  comentario_encargado text,
  comentario_rrhh text,
  enviado_at timestamptz,
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vacaciones_cobertura_dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobertura_id uuid NOT NULL REFERENCES public.vacaciones_cobertura(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  tipo text NOT NULL DEFAULT 'empleado',
  empleado_cobertura_id uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  sucursal_origen_id uuid REFERENCES public.sucursales(id),
  hora_entrada time,
  hora_salida time,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cobertura_id, fecha)
);

CREATE TABLE public.vacaciones_cobertura_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobertura_id uuid NOT NULL REFERENCES public.vacaciones_cobertura(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.empleados(id),
  autor_rol text,
  mensaje text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vac_cobertura_estado ON public.vacaciones_cobertura(estado);
CREATE INDEX idx_vac_cobertura_sucursal ON public.vacaciones_cobertura(sucursal_id);
CREATE INDEX idx_vac_cobertura_dias_cob ON public.vacaciones_cobertura_dias(cobertura_id);
CREATE INDEX idx_vac_cobertura_com_cob ON public.vacaciones_cobertura_comentarios(cobertura_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacaciones_cobertura TO authenticated;
GRANT ALL ON public.vacaciones_cobertura TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacaciones_cobertura_dias TO authenticated;
GRANT ALL ON public.vacaciones_cobertura_dias TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacaciones_cobertura_comentarios TO authenticated;
GRANT ALL ON public.vacaciones_cobertura_comentarios TO service_role;

ALTER TABLE public.vacaciones_cobertura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacaciones_cobertura_dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacaciones_cobertura_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobertura admin all" ON public.vacaciones_cobertura
  FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

CREATE POLICY "cobertura gerente select" ON public.vacaciones_cobertura
  FOR SELECT TO authenticated USING (sucursal_id = public.current_user_sucursal_id());

CREATE POLICY "cobertura gerente insert" ON public.vacaciones_cobertura
  FOR INSERT TO authenticated WITH CHECK (sucursal_id = public.current_user_sucursal_id());

CREATE POLICY "cobertura gerente update" ON public.vacaciones_cobertura
  FOR UPDATE TO authenticated
  USING (sucursal_id = public.current_user_sucursal_id() AND estado IN ('borrador','cambios_sugeridos'))
  WITH CHECK (sucursal_id = public.current_user_sucursal_id());

CREATE POLICY "cobertura dias admin all" ON public.vacaciones_cobertura_dias
  FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

CREATE POLICY "cobertura dias gerente select" ON public.vacaciones_cobertura_dias
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.vacaciones_cobertura c
    WHERE c.id = cobertura_id AND c.sucursal_id = public.current_user_sucursal_id()));

CREATE POLICY "cobertura dias gerente write" ON public.vacaciones_cobertura_dias
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.vacaciones_cobertura c
    WHERE c.id = cobertura_id AND c.sucursal_id = public.current_user_sucursal_id()
      AND c.estado IN ('borrador','cambios_sugeridos')));

CREATE POLICY "cobertura dias gerente update" ON public.vacaciones_cobertura_dias
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.vacaciones_cobertura c
    WHERE c.id = cobertura_id AND c.sucursal_id = public.current_user_sucursal_id()
      AND c.estado IN ('borrador','cambios_sugeridos')))
  WITH CHECK (true);

CREATE POLICY "cobertura dias gerente delete" ON public.vacaciones_cobertura_dias
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.vacaciones_cobertura c
    WHERE c.id = cobertura_id AND c.sucursal_id = public.current_user_sucursal_id()
      AND c.estado IN ('borrador','cambios_sugeridos')));

CREATE POLICY "cobertura com select" ON public.vacaciones_cobertura_comentarios
  FOR SELECT TO authenticated USING (public.is_admin_rrhh() OR EXISTS (
    SELECT 1 FROM public.vacaciones_cobertura c
    WHERE c.id = cobertura_id AND c.sucursal_id = public.current_user_sucursal_id()));

CREATE POLICY "cobertura com insert" ON public.vacaciones_cobertura_comentarios
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_rrhh() OR EXISTS (
    SELECT 1 FROM public.vacaciones_cobertura c
    WHERE c.id = cobertura_id AND c.sucursal_id = public.current_user_sucursal_id()));

CREATE TRIGGER trg_vac_cobertura_updated BEFORE UPDATE ON public.vacaciones_cobertura
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_vac_cobertura_dias_updated BEFORE UPDATE ON public.vacaciones_cobertura_dias
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();