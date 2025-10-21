-- Crear bucket para certificados médicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-medicos', 'certificados-medicos', false);

-- Crear tabla de ausencias médicas
CREATE TABLE public.ausencias_medicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  tipo_enfermedad TEXT,
  certificado_url TEXT,
  observaciones TEXT,
  registrado_por UUID REFERENCES public.empleados(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ausencias_medicas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ausencias médicas
CREATE POLICY "Admin RRHH puede gestionar ausencias médicas"
ON public.ausencias_medicas
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

CREATE POLICY "Empleados pueden ver sus propias ausencias médicas"
ON public.ausencias_medicas
FOR SELECT
USING (empleado_id = get_current_empleado());

-- Políticas de storage para certificados médicos
CREATE POLICY "Admin RRHH puede subir certificados"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificados-medicos'
  AND EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

CREATE POLICY "Admin RRHH puede ver certificados"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificados-medicos'
  AND EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

CREATE POLICY "Empleados pueden ver sus propios certificados"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'certificados-medicos'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM empleados
    WHERE user_id = auth.uid()
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_ausencias_medicas_updated_at
BEFORE UPDATE ON public.ausencias_medicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_ausencias_medicas_empleado ON public.ausencias_medicas(empleado_id);
CREATE INDEX idx_ausencias_medicas_fechas ON public.ausencias_medicas(fecha_inicio, fecha_fin);