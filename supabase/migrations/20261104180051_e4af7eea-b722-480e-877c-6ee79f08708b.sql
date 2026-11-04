CREATE TABLE public.telegram_autorizados (
  chat_id TEXT NOT NULL PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  puede_notas BOOLEAN NOT NULL DEFAULT true,
  puede_fichero BOOLEAN NOT NULL DEFAULT true,
  puede_vacaciones BOOLEAN NOT NULL DEFAULT true,
  puede_agenda BOOLEAN NOT NULL DEFAULT true,
  puede_administrar BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  autorizado_por UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_autorizados TO authenticated;
GRANT ALL ON public.telegram_autorizados TO service_role;

ALTER TABLE public.telegram_autorizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_autorizados_rrhh_select" ON public.telegram_autorizados
  FOR SELECT TO authenticated USING (public.is_admin_rrhh());

CREATE POLICY "telegram_autorizados_rrhh_write" ON public.telegram_autorizados
  FOR ALL TO authenticated
  USING (public.is_admin_rrhh())
  WITH CHECK (public.is_admin_rrhh());

CREATE TRIGGER trg_telegram_autorizados_updated_at
  BEFORE UPDATE ON public.telegram_autorizados
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.telegram_solicitudes (
  chat_id TEXT NOT NULL PRIMARY KEY,
  nombre TEXT,
  username TEXT,
  visto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.telegram_solicitudes TO authenticated;
GRANT ALL ON public.telegram_solicitudes TO service_role;

ALTER TABLE public.telegram_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_solicitudes_rrhh_select" ON public.telegram_solicitudes
  FOR SELECT TO authenticated USING (public.is_admin_rrhh());

CREATE POLICY "telegram_solicitudes_rrhh_update" ON public.telegram_solicitudes
  FOR UPDATE TO authenticated
  USING (public.is_admin_rrhh())
  WITH CHECK (public.is_admin_rrhh());

CREATE TRIGGER trg_telegram_solicitudes_updated_at
  BEFORE UPDATE ON public.telegram_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();