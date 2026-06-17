
CREATE TABLE public.planilla_descansos_turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  numero_turno INT NOT NULL CHECK (numero_turno BETWEEN 1 AND 20),
  hora_desde TIME NOT NULL,
  hora_hasta TIME NOT NULL,
  permite_gerente BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sucursal_id, numero_turno)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planilla_descansos_turnos TO authenticated;
GRANT ALL ON public.planilla_descansos_turnos TO service_role;

ALTER TABLE public.planilla_descansos_turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth ve turnos" ON public.planilla_descansos_turnos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "RRHH gestiona turnos" ON public.planilla_descansos_turnos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE TABLE public.planilla_descansos_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES public.planilla_descansos_turnos(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_planilla_emp_semana
  ON public.planilla_descansos_asignaciones (empleado_id, sucursal_id, semana_inicio)
  WHERE activo = true;

CREATE INDEX idx_planilla_semana ON public.planilla_descansos_asignaciones (sucursal_id, semana_inicio);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planilla_descansos_asignaciones TO authenticated;
GRANT ALL ON public.planilla_descansos_asignaciones TO service_role;

ALTER TABLE public.planilla_descansos_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth ve asignaciones" ON public.planilla_descansos_asignaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "RRHH gestiona asignaciones" ON public.planilla_descansos_asignaciones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE TRIGGER trg_planilla_turnos_upd BEFORE UPDATE ON public.planilla_descansos_turnos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_planilla_asig_upd BEFORE UPDATE ON public.planilla_descansos_asignaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.planilla_descansos_turnos (sucursal_id, numero_turno, hora_desde, hora_hasta, permite_gerente) VALUES
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 1, '10:50', '11:30', true),
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 2, '11:30', '12:10', true),
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 3, '12:10', '12:50', true),
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 4, '12:50', '13:30', true),
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 5, '13:30', '14:10', true),
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 6, '14:10', '14:50', true),
  ('9682b6cf-f904-4497-918c-d0c9c061b9ec', 7, '14:50', '15:30', false);

ALTER TYPE public.incidencia_tipo ADD VALUE IF NOT EXISTS 'descanso_fuera_turno';
ALTER TYPE public.incidencia_tipo ADD VALUE IF NOT EXISTS 'descanso_sin_turno';
