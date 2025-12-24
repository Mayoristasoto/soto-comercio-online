-- Permitir a admins/gerentes visualizar fotos del bucket privado fichajes-verificacion
-- (necesario para generar URLs firmadas y descargar/ver la imagen)

CREATE POLICY "Managers can view verification photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fichajes-verificacion'
  AND is_admin_or_manager() = true
);
