-- Actualizar URLs de documentos obligatorios para usar el bucket correcto
UPDATE documentos_obligatorios
SET url_archivo = REPLACE(
  url_archivo,
  '/storage/v1/object/public/employee-documents/mandatory-documents/',
  '/storage/v1/object/public/mandatory-documents/mandatory-documents/'
)
WHERE url_archivo LIKE '%/storage/v1/object/public/employee-documents/mandatory-documents/%';