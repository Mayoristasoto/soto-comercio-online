-- Add storage policy for anon uploads (correct syntax without IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Kiosk can upload verification photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Kiosk can upload verification photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''fichajes-verificacion'')';
  END IF;
END
$$;