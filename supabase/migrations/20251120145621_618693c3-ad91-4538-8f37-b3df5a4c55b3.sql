-- Tabla de configuración de modelos de IA
CREATE TABLE IF NOT EXISTS public.configuracion_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'text',
  opciones JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES empleados(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.configuracion_ia ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo administradores pueden ver y modificar
CREATE POLICY "Administradores pueden ver configuración IA"
  ON public.configuracion_ia
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.user_id = auth.uid()
      AND empleados.rol = 'admin_rrhh'
    )
  );

CREATE POLICY "Administradores pueden actualizar configuración IA"
  ON public.configuracion_ia
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.user_id = auth.uid()
      AND empleados.rol = 'admin_rrhh'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.user_id = auth.uid()
      AND empleados.rol = 'admin_rrhh'
    )
  );

CREATE POLICY "Administradores pueden insertar configuración IA"
  ON public.configuracion_ia
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados
      WHERE empleados.user_id = auth.uid()
      AND empleados.rol = 'admin_rrhh'
    )
  );

-- Insertar configuración por defecto para generación de imágenes
INSERT INTO public.configuracion_ia (clave, valor, descripcion, tipo, opciones)
VALUES 
  (
    'modelo_generacion_imagenes',
    'google/gemini-2.5-flash-image',
    'Modelo de IA utilizado para generar imágenes de cumpleaños',
    'select',
    '["google/gemini-2.5-flash-image", "google/gemini-2.5-pro", "google/gemini-2.5-flash"]'::jsonb
  )
ON CONFLICT (clave) DO NOTHING;