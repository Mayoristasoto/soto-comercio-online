-- Remove broad SELECT policies that allow listing all objects in public buckets.
-- Public buckets keep serving files via their direct public URL without these policies.
DROP POLICY IF EXISTS "Public read facial photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mandatory documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Brand logos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view instructivo screenshots" ON storage.objects;