-- Create storage bucket for instructivo screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('instructivo-screenshots', 'instructivo-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload instructivo screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'instructivo-screenshots');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update instructivo screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'instructivo-screenshots');

-- Allow everyone to view screenshots
CREATE POLICY "Everyone can view instructivo screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'instructivo-screenshots');

-- Allow authenticated users to delete screenshots
CREATE POLICY "Authenticated users can delete instructivo screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'instructivo-screenshots');