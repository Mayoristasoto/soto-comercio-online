-- Crear tabla de notificaciones si no existe
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para notificaciones
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
  ON public.notificaciones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones"
  ON public.notificaciones
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Tabla para configuración de tareas de onboarding por puesto
CREATE TABLE IF NOT EXISTS public.onboarding_tareas_puesto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto_id UUID REFERENCES public.puestos(id) ON DELETE CASCADE,
  tarea_tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  obligatoria BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  categoria TEXT DEFAULT 'importante',
  dias_limite INTEGER,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_puesto_tarea UNIQUE(puesto_id, tarea_tipo)
);

-- Habilitar RLS
ALTER TABLE public.onboarding_tareas_puesto ENABLE ROW LEVEL SECURITY;

-- Políticas para configuración de tareas
CREATE POLICY "Los administradores pueden ver todas las tareas de onboarding"
  ON public.onboarding_tareas_puesto
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados 
      WHERE user_id = auth.uid() 
      AND rol = 'admin_rrhh' 
      AND activo = true
    )
  );

CREATE POLICY "Los administradores pueden crear tareas de onboarding"
  ON public.onboarding_tareas_puesto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados 
      WHERE user_id = auth.uid() 
      AND rol = 'admin_rrhh' 
      AND activo = true
    )
  );

CREATE POLICY "Los administradores pueden actualizar tareas de onboarding"
  ON public.onboarding_tareas_puesto
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados 
      WHERE user_id = auth.uid() 
      AND rol = 'admin_rrhh' 
      AND activo = true
    )
  );

CREATE POLICY "Los administradores pueden eliminar tareas de onboarding"
  ON public.onboarding_tareas_puesto
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados 
      WHERE user_id = auth.uid() 
      AND rol = 'admin_rrhh' 
      AND activo = true
    )
  );

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida ON public.notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON public.notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_tareas_puesto ON public.onboarding_tareas_puesto(puesto_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_notificaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notificaciones_updated_at
  BEFORE UPDATE ON public.notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_notificaciones_updated_at();

CREATE TRIGGER onboarding_tareas_puesto_updated_at
  BEFORE UPDATE ON public.onboarding_tareas_puesto
  FOR EACH ROW
  EXECUTE FUNCTION update_notificaciones_updated_at();

-- Insertar tareas de onboarding por defecto para todos los puestos existentes
INSERT INTO public.onboarding_tareas_puesto (puesto_id, tarea_tipo, titulo, descripcion, obligatoria, orden, categoria, dias_limite)
SELECT 
  p.id,
  'cambio_password',
  'Cambiar contraseña inicial',
  'Actualiza tu contraseña por una segura y personal',
  true,
  1,
  'esencial',
  3
FROM public.puestos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_tareas_puesto otp 
  WHERE otp.puesto_id = p.id AND otp.tarea_tipo = 'cambio_password'
)
ON CONFLICT (puesto_id, tarea_tipo) DO NOTHING;

INSERT INTO public.onboarding_tareas_puesto (puesto_id, tarea_tipo, titulo, descripcion, obligatoria, orden, categoria, dias_limite)
SELECT 
  p.id,
  'perfil_completado',
  'Completar perfil',
  'Agrega tu información personal y de contacto',
  true,
  2,
  'esencial',
  5
FROM public.puestos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_tareas_puesto otp 
  WHERE otp.puesto_id = p.id AND otp.tarea_tipo = 'perfil_completado'
)
ON CONFLICT (puesto_id, tarea_tipo) DO NOTHING;

INSERT INTO public.onboarding_tareas_puesto (puesto_id, tarea_tipo, titulo, descripcion, obligatoria, orden, categoria, dias_limite)
SELECT 
  p.id,
  'foto_facial',
  'Subir foto facial',
  'Necesaria para el sistema de fichaje biométrico',
  true,
  3,
  'esencial',
  7
FROM public.puestos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_tareas_puesto otp 
  WHERE otp.puesto_id = p.id AND otp.tarea_tipo = 'foto_facial'
)
ON CONFLICT (puesto_id, tarea_tipo) DO NOTHING;

COMMENT ON TABLE public.notificaciones IS 'Tabla para almacenar notificaciones del sistema para usuarios';
COMMENT ON TABLE public.onboarding_tareas_puesto IS 'Configuración de tareas de onboarding personalizadas por puesto de trabajo';
