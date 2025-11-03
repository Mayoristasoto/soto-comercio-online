-- Tabla para almacenar fotos de empleados pendientes de aprobación
CREATE TABLE public.facial_photo_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  comentarios TEXT,
  revisado_por UUID REFERENCES public.empleados(id),
  fecha_revision TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.facial_photo_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Empleados pueden crear sus propias solicitudes de foto
CREATE POLICY "Empleados pueden subir sus fotos"
ON public.facial_photo_uploads
FOR INSERT
WITH CHECK (empleado_id = get_current_empleado());

-- Policy: Empleados pueden ver sus propias fotos
CREATE POLICY "Empleados pueden ver sus fotos"
ON public.facial_photo_uploads
FOR SELECT
USING (empleado_id = get_current_empleado());

-- Policy: Admin RRHH puede ver todas las fotos
CREATE POLICY "Admin puede ver todas las fotos"
ON public.facial_photo_uploads
FOR SELECT
USING (current_user_is_admin());

-- Policy: Admin RRHH puede actualizar estado de fotos
CREATE POLICY "Admin puede actualizar fotos"
ON public.facial_photo_uploads
FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Policy: Admin RRHH puede eliminar fotos
CREATE POLICY "Admin puede eliminar fotos"
ON public.facial_photo_uploads
FOR DELETE
USING (current_user_is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_facial_photo_uploads_updated_at
BEFORE UPDATE ON public.facial_photo_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket de storage para fotos faciales si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('facial-photos', 'facial-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para el bucket
CREATE POLICY "Empleados pueden subir sus fotos faciales"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'facial-photos' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT e.id::text 
    FROM empleados e 
    WHERE e.user_id = auth.uid()
  )
);

CREATE POLICY "Admin puede ver todas las fotos faciales"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'facial-photos' AND
  current_user_is_admin()
);

CREATE POLICY "Empleados pueden ver sus fotos faciales"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'facial-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT e.id::text 
    FROM empleados e 
    WHERE e.user_id = auth.uid()
  )
);

CREATE POLICY "Admin puede eliminar fotos faciales"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'facial-photos' AND
  current_user_is_admin()
);