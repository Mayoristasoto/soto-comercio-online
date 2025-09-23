-- Add new columns to empleados table for enhanced profile information
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS puesto TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS salario NUMERIC(12,2);
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS estado_civil TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS emergencia_contacto_nombre TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS emergencia_contacto_telefono TEXT;

-- Create table for employee documents
CREATE TABLE IF NOT EXISTS public.empleado_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('contrato', 'identificacion', 'curriculum', 'titulo', 'certificado', 'otro')),
  nombre_archivo TEXT NOT NULL,
  url_archivo TEXT NOT NULL,
  descripcion TEXT,
  fecha_subida TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subido_por UUID REFERENCES public.empleados(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on empleado_documentos
ALTER TABLE public.empleado_documentos ENABLE ROW LEVEL SECURITY;

-- Create policies for empleado_documentos
CREATE POLICY "Admins pueden gestionar documentos"
ON public.empleado_documentos
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver sus documentos"
ON public.empleado_documentos
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

-- Create table for detailed permissions
CREATE TABLE IF NOT EXISTS public.empleado_permisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  permiso TEXT NOT NULL,
  habilitado BOOLEAN NOT NULL DEFAULT false,
  fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  asignado_por UUID REFERENCES public.empleados(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, modulo, permiso)
);

-- Enable RLS on empleado_permisos
ALTER TABLE public.empleado_permisos ENABLE ROW LEVEL SECURITY;

-- Create policies for empleado_permisos
CREATE POLICY "Admins pueden gestionar permisos"
ON public.empleado_permisos
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver sus permisos"
ON public.empleado_permisos
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for employee documents
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-documents' AND current_user_is_admin());

CREATE POLICY "Admins can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'employee-documents' AND current_user_is_admin());

CREATE POLICY "Employees can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' 
  AND (storage.foldername(name))[1] = get_current_empleado()::text
);

CREATE POLICY "Admins can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'employee-documents' AND current_user_is_admin());

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'employee-documents' AND current_user_is_admin());

-- Create triggers for updated_at columns
CREATE TRIGGER update_empleado_documentos_updated_at
BEFORE UPDATE ON public.empleado_documentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empleado_permisos_updated_at
BEFORE UPDATE ON public.empleado_permisos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();