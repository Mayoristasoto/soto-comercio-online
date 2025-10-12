-- Create mandatory-documents bucket for public access to mandatory documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('mandatory-documents', 'mandatory-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for mandatory-documents bucket
CREATE POLICY "Public can view mandatory documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'mandatory-documents');

CREATE POLICY "Authenticated users can upload mandatory documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mandatory-documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update mandatory documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mandatory-documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can delete mandatory documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mandatory-documents' 
  AND EXISTS (
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh' 
    AND activo = true
  )
);