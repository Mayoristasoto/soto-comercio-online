-- Crear bucket de storage para imágenes de góndolas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gondola-images', 'gondola-images', true);

-- Agregar columna para imagen en la tabla gondolas
ALTER TABLE public.gondolas 
ADD COLUMN image_url text;

-- Crear políticas de storage para el bucket gondola-images
CREATE POLICY "Allow public read access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gondola-images');

CREATE POLICY "Allow authenticated users to upload images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'gondola-images');

CREATE POLICY "Allow authenticated users to update their images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'gondola-images');

CREATE POLICY "Allow authenticated users to delete images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'gondola-images');