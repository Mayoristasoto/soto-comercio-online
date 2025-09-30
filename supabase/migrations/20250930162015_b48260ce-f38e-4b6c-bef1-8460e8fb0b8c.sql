-- Fix storage policies for employee-documents bucket to allow task photo uploads

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Empleados pueden subir sus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Empleados pueden ver sus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede gestionar todos los documentos" ON storage.objects;

-- Create policy for employees to upload their task photos
CREATE POLICY "Empleados pueden subir archivos de tareas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] = 'tareas'
);

-- Create policy for employees to view task photos
CREATE POLICY "Empleados pueden ver archivos de tareas"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] = 'tareas'
);

-- Create policy for employees to upload their personal documents
CREATE POLICY "Empleados pueden subir sus documentos personales"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for employees to view their own documents
CREATE POLICY "Empleados pueden ver sus propios documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for admins to manage all documents
CREATE POLICY "Admin puede gestionar todos los documentos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  EXISTS (
    SELECT 1 FROM empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol = 'admin_rrhh'
    AND empleados.activo = true
  )
)
WITH CHECK (
  bucket_id = 'employee-documents' AND
  EXISTS (
    SELECT 1 FROM empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol = 'admin_rrhh'
    AND empleados.activo = true
  )
);