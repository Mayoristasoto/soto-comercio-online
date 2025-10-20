-- Crear tabla para gestión de páginas/rutas
CREATE TABLE IF NOT EXISTS public.app_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  titulo_pagina TEXT,
  parent_id UUID REFERENCES public.app_pages(id) ON DELETE SET NULL,
  descripcion TEXT,
  icon TEXT DEFAULT 'FileText',
  orden INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  requiere_auth BOOLEAN NOT NULL DEFAULT true,
  roles_permitidos TEXT[] DEFAULT ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_app_pages_parent_id ON public.app_pages(parent_id);
CREATE INDEX idx_app_pages_path ON public.app_pages(path);
CREATE INDEX idx_app_pages_visible ON public.app_pages(visible);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_app_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_pages_updated_at_trigger
  BEFORE UPDATE ON public.app_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_app_pages_updated_at();

-- Habilitar RLS
ALTER TABLE public.app_pages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin RRHH puede gestionar páginas"
  ON public.app_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

CREATE POLICY "Usuarios autenticados pueden ver páginas visibles"
  ON public.app_pages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND visible = true
  );

-- Insertar páginas existentes
INSERT INTO public.app_pages (path, nombre, titulo_pagina, descripcion, icon, orden, roles_permitidos) VALUES
  ('/dashboard', 'Dashboard', 'Panel Principal', 'Panel de control principal', 'LayoutDashboard', 1, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/fichero', 'Fichero', 'Control de Asistencia', 'Sistema de fichaje y control horario', 'Clock', 2, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/tareas', 'Tareas', 'Gestión de Tareas', 'Administración de tareas y actividades', 'CheckSquare', 3, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/evaluaciones', 'Evaluaciones', 'Evaluaciones', 'Sistema de evaluaciones mensuales', 'ClipboardList', 4, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/vacaciones', 'Vacaciones', 'Gestión de Vacaciones', 'Solicitudes y aprobación de vacaciones', 'Calendar', 5, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/solicitudes', 'Solicitudes', 'Solicitudes', 'Sistema de solicitudes varias', 'FileText', 6, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/desafios', 'Desafíos', 'Desafíos', 'Gestión de desafíos y competencias', 'Trophy', 7, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/premios', 'Premios', 'Premios', 'Catálogo de premios y canjes', 'Gift', 8, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/ranking', 'Ranking', 'Ranking', 'Clasificaciones y puntuaciones', 'Award', 9, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/insignias', 'Insignias', 'Insignias', 'Logros y medallas', 'Medal', 10, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/gondolas', 'Góndolas', 'Gestión de Góndolas', 'Administración de góndolas y displays', 'Store', 11, ARRAY['admin_rrhh', 'gerente_sucursal']),
  ('/anotaciones', 'Anotaciones', 'Anotaciones', 'Registro de anotaciones', 'BookOpen', 12, ARRAY['admin_rrhh', 'gerente_sucursal']),
  ('/configuracion', 'Configuración', 'Configuración del Sistema', 'Ajustes y configuración general', 'Settings', 13, ARRAY['admin_rrhh']),
  ('/admin', 'Administración', 'Panel de Administración', 'Gestión administrativa completa', 'Shield', 14, ARRAY['admin_rrhh'])
ON CONFLICT (path) DO NOTHING;