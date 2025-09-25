-- Crear una nueva tabla para almacenar múltiples versiones de rostros por empleado
CREATE TABLE IF NOT EXISTS public.empleados_rostros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  face_descriptor FLOAT[] NOT NULL,
  version_name TEXT NOT NULL DEFAULT 'Versión ' || (EXTRACT(EPOCH FROM now())::INTEGER),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  confidence_score FLOAT DEFAULT 0.0,
  capture_metadata JSONB DEFAULT '{}',
  UNIQUE(empleado_id, version_name)
);

-- Habilitar RLS
ALTER TABLE public.empleados_rostros ENABLE ROW LEVEL SECURITY;

-- Política para administradores
CREATE POLICY "admin_can_manage_face_versions" 
ON public.empleados_rostros 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh' 
    AND activo = true
  )
);

-- Función para actualizar timestamp
CREATE TRIGGER update_empleados_rostros_updated_at
  BEFORE UPDATE ON public.empleados_rostros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejor rendimiento
CREATE INDEX idx_empleados_rostros_empleado_id ON public.empleados_rostros(empleado_id);
CREATE INDEX idx_empleados_rostros_active ON public.empleados_rostros(empleado_id, is_active) WHERE is_active = true;