-- Drop ALL existing storage policies for employee-documents bucket
DROP POLICY IF EXISTS "Empleados pueden subir archivos de tareas" ON storage.objects;
DROP POLICY IF EXISTS "Empleados pueden ver archivos de tareas" ON storage.objects;
DROP POLICY IF EXISTS "Empleados pueden subir sus documentos personales" ON storage.objects;
DROP POLICY IF EXISTS "Empleados pueden ver sus propios documentos" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede gestionar todos los documentos" ON storage.objects;
DROP POLICY IF EXISTS "Empleados pueden subir sus documentos" ON storage.objects;
DROP POLICY IF EXISTS "Empleados pueden ver sus documentos" ON storage.objects;

-- Now create the correct policies
-- Policy for ALL authenticated users to upload task photos
CREATE POLICY "Empleados pueden subir archivos de tareas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] = 'tareas'
);

-- Policy for ALL authenticated users to view task photos
CREATE POLICY "Empleados pueden ver archivos de tareas"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] = 'tareas'
);

-- Policy for employees to upload their own personal documents
CREATE POLICY "Empleados pueden subir sus documentos personales"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] != 'tareas' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for employees to view their own personal documents  
CREATE POLICY "Empleados pueden ver sus propios documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  (storage.foldername(name))[1] != 'tareas' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for admins to manage everything
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