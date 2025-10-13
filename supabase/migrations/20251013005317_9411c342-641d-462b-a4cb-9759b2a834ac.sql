-- Crear tabla para configuración de links del sidebar
CREATE TABLE IF NOT EXISTS public.sidebar_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol user_role NOT NULL,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES public.sidebar_links(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(rol, path)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sidebar_links_rol ON public.sidebar_links(rol);
CREATE INDEX IF NOT EXISTS idx_sidebar_links_parent ON public.sidebar_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_links_orden ON public.sidebar_links(orden);

-- Habilitar RLS
ALTER TABLE public.sidebar_links ENABLE ROW LEVEL SECURITY;

-- Política para que todos puedan ver los links
DROP POLICY IF EXISTS "Todos pueden ver sidebar_links" ON public.sidebar_links;
CREATE POLICY "Todos pueden ver sidebar_links"
  ON public.sidebar_links
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para que solo admins puedan modificar
DROP POLICY IF EXISTS "Solo admins pueden modificar sidebar_links" ON public.sidebar_links;
CREATE POLICY "Solo admins pueden modificar sidebar_links"
  ON public.sidebar_links
  FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_sidebar_links_updated_at ON public.sidebar_links;
CREATE TRIGGER update_sidebar_links_updated_at
  BEFORE UPDATE ON public.sidebar_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar links por defecto para admin_rrhh
INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible) VALUES
  ('admin_rrhh', 'Dashboard', '/dashboard', 'LayoutDashboard', 'Panel de control principal', 1, true),
  ('admin_rrhh', 'Fichero', '/fichero', 'Clock', 'Control de asistencia', 2, true),
  ('admin_rrhh', 'Personal', '/admin', 'Users', 'Gestión de empleados', 3, true),
  ('admin_rrhh', 'Nómina', '/nomina', 'DollarSign', 'Gestión de nóminas', 4, true),
  ('admin_rrhh', 'Vacaciones', '/vacaciones', 'Palmtree', 'Gestión de vacaciones', 5, true),
  ('admin_rrhh', 'Solicitudes', '/solicitudes', 'FileText', 'Gestión de solicitudes', 6, true),
  ('admin_rrhh', 'Evaluaciones', '/evaluaciones', 'ClipboardCheck', 'Evaluaciones de desempeño', 7, true),
  ('admin_rrhh', 'Anotaciones', '/anotaciones', 'StickyNote', 'Registro de anotaciones', 8, true),
  ('admin_rrhh', 'Góndolas', '/gondolas', 'Store', 'Gestión de góndolas', 9, true)
ON CONFLICT (rol, path) DO NOTHING;

-- Insertar submenu Reconoce para admin_rrhh
DO $$
DECLARE
  reconoce_parent_id UUID;
BEGIN
  INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible)
  VALUES ('admin_rrhh', 'Reconoce', '/reconoce-menu', 'Trophy', 'Sistema de reconocimiento', 10, true)
  ON CONFLICT (rol, path) DO UPDATE SET id = sidebar_links.id
  RETURNING id INTO reconoce_parent_id;

  INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible, parent_id) VALUES
    ('admin_rrhh', 'Premios', '/premios', 'Gift', 'Gestión de premios', 1, true, reconoce_parent_id),
    ('admin_rrhh', 'Desafíos', '/desafios', 'Target', 'Gestión de desafíos', 2, true, reconoce_parent_id),
    ('admin_rrhh', 'Ranking', '/ranking', 'TrendingUp', 'Ranking de empleados', 3, true, reconoce_parent_id),
    ('admin_rrhh', 'Insignias', '/insignias', 'Award', 'Gestión de insignias', 4, true, reconoce_parent_id)
  ON CONFLICT (rol, path) DO NOTHING;
END $$;

-- Insertar submenu Tareas para admin_rrhh
DO $$
DECLARE
  tareas_parent_id UUID;
BEGIN
  INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible)
  VALUES ('admin_rrhh', 'Tareas', '/tareas-menu', 'CheckSquare', 'Gestión de tareas', 11, true)
  ON CONFLICT (rol, path) DO UPDATE SET id = sidebar_links.id
  RETURNING id INTO tareas_parent_id;

  INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible, parent_id) VALUES
    ('admin_rrhh', 'Mis Tareas', '/tareas', 'ListTodo', 'Ver mis tareas', 1, true, tareas_parent_id),
    ('admin_rrhh', 'Crear Tarea', '/tareas/nueva', 'Plus', 'Crear nueva tarea', 2, true, tareas_parent_id)
  ON CONFLICT (rol, path) DO NOTHING;
END $$;

-- Insertar links por defecto para gerente_sucursal
INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible) VALUES
  ('gerente_sucursal', 'Dashboard', '/dashboard', 'LayoutDashboard', 'Panel de control', 1, true),
  ('gerente_sucursal', 'Fichero', '/fichero', 'Clock', 'Control de asistencia', 2, true),
  ('gerente_sucursal', 'Personal', '/admin', 'Users', 'Gestión de empleados', 3, true),
  ('gerente_sucursal', 'Evaluaciones', '/evaluaciones', 'ClipboardCheck', 'Evaluaciones', 4, true),
  ('gerente_sucursal', 'Anotaciones', '/anotaciones', 'StickyNote', 'Anotaciones', 5, true),
  ('gerente_sucursal', 'Góndolas', '/gondolas', 'Store', 'Góndolas', 6, true)
ON CONFLICT (rol, path) DO NOTHING;

-- Insertar links por defecto para empleado
INSERT INTO public.sidebar_links (rol, label, path, icon, descripcion, orden, visible) VALUES
  ('empleado', 'Inicio', '/empleado', 'Home', 'Página principal', 1, true),
  ('empleado', 'Mi Perfil', '/empleado/perfil', 'User', 'Mi información personal', 2, true),
  ('empleado', 'Mis Tareas', '/empleado/tareas', 'CheckSquare', 'Mis tareas pendientes', 3, true),
  ('empleado', 'Documentos', '/empleado/documentos', 'FileText', 'Mis documentos', 4, true),
  ('empleado', 'Mis Premios', '/empleado/premios', 'Gift', 'Premios recibidos', 5, true),
  ('empleado', 'Mis Insignias', '/empleado/insignias', 'Award', 'Insignias obtenidas', 6, true),
  ('empleado', 'Capacitaciones', '/empleado/capacitaciones', 'GraduationCap', 'Mis capacitaciones', 7, true),
  ('empleado', 'Autogestión', '/autogestion', 'Settings', 'Autogestión', 8, true)
ON CONFLICT (rol, path) DO NOTHING;