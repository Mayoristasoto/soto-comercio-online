-- Crear tabla de configuración del sistema de calificaciones
CREATE TABLE IF NOT EXISTS calificaciones_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'text',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES empleados(id)
);

-- Habilitar RLS
ALTER TABLE calificaciones_config ENABLE ROW LEVEL SECURITY;

-- Políticas para configuración
CREATE POLICY "Admins pueden gestionar configuración calificaciones"
ON calificaciones_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

CREATE POLICY "Todos pueden leer configuración calificaciones"
ON calificaciones_config FOR SELECT
USING (true);

-- Agregar campos a la tabla de calificaciones_empleados
ALTER TABLE calificaciones_empleados 
ADD COLUMN IF NOT EXISTS calificacion_servicio INTEGER CHECK (calificacion_servicio >= 1 AND calificacion_servicio <= 5),
ADD COLUMN IF NOT EXISTS cliente_nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS cliente_dni TEXT,
ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
ADD COLUMN IF NOT EXISTS participa_sorteo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sorteo_numero INTEGER;

-- Crear índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_calificaciones_cliente_dni ON calificaciones_empleados(cliente_dni);
CREATE INDEX IF NOT EXISTS idx_calificaciones_sorteo ON calificaciones_empleados(participa_sorteo, sorteo_numero);

-- Insertar configuración por defecto
INSERT INTO calificaciones_config (clave, valor, descripcion, tipo) VALUES
  ('sorteo_activo', 'true', 'Habilitar participación en sorteos', 'boolean'),
  ('sorteo_titulo', '¡Participa en nuestro sorteo mensual!', 'Título del mensaje de sorteo', 'text'),
  ('sorteo_descripcion', 'Al calificar nuestro servicio, automáticamente participas por increíbles premios. ¡Gracias por tu preferencia!', 'Descripción del sorteo', 'textarea'),
  ('mensaje_agradecimiento', '¡Gracias por tu calificación!', 'Mensaje de agradecimiento después de calificar', 'text'),
  ('requiere_datos_cliente', 'true', 'Solicitar datos del cliente para participar', 'boolean'),
  ('campos_opcionales', 'telefono', 'Campos opcionales (separados por coma): nombre,dni,telefono', 'text'),
  ('calificar_servicio', 'true', 'Habilitar calificación del servicio además del empleado', 'boolean')
ON CONFLICT (clave) DO NOTHING;