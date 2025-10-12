-- Revertir cambio de URLs
UPDATE documentos_obligatorios
SET url_archivo = REPLACE(
  url_archivo,
  '/storage/v1/object/public/mandatory-documents/mandatory-documents/',
  '/storage/v1/object/public/employee-documents/mandatory-documents/'
)
WHERE url_archivo LIKE '%/storage/v1/object/public/mandatory-documents/mandatory-documents/%';

-- Drop policy if exists and recreate
DROP POLICY IF EXISTS "Public can view mandatory documents in employee-documents" ON storage.objects;

-- Crear política pública para la carpeta mandatory-documents en employee-documents
CREATE POLICY "Public can view mandatory documents in employee-documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents' 
  AND (storage.foldername(name))[1] = 'mandatory-documents'
);