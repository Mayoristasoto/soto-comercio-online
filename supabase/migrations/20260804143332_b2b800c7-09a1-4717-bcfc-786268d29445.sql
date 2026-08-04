CREATE TABLE public.encargado_dashboard_accesos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave text NOT NULL UNIQUE,
  titulo text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  icono text NOT NULL DEFAULT 'LayoutDashboard',
  url text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.encargado_dashboard_accesos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.encargado_dashboard_accesos TO authenticated;
GRANT ALL ON public.encargado_dashboard_accesos TO service_role;

ALTER TABLE public.encargado_dashboard_accesos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver accesos"
ON public.encargado_dashboard_accesos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Solo admin RRHH puede gestionar accesos"
ON public.encargado_dashboard_accesos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::public.user_role));

CREATE TRIGGER update_encargado_dashboard_accesos_updated_at
BEFORE UPDATE ON public.encargado_dashboard_accesos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.encargado_dashboard_accesos (clave, titulo, descripcion, icono, url, orden) VALUES
  ('vacaciones', 'Carga de vacaciones', 'Cargar y consultar vacaciones del personal de tu sucursal', 'Calendar', '/rrhh/vacaciones', 1),
  ('inventario', 'Control de inventario sucursal', 'Relevamiento y control de góndolas e inventario', 'Package', '/admin/gondolas', 2),
  ('planificacion', 'Planificación semanal', 'Armar la semana y cubrir ausencias o vacaciones', 'CalendarRange', '/operaciones/fichero#horarios', 3),
  ('cambios-horario', 'Cambios de horario por día', 'Registrar cambios o intercambios de horario entre empleados', 'Repeat', '/operaciones/fichero#cambios', 4);