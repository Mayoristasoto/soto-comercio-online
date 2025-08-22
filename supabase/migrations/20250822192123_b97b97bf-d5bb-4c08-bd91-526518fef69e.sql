-- Create a policy that allows public read access but restricts write operations to authenticated users
DROP POLICY IF EXISTS "Authenticated users only - view gondolas" ON public.gondolas;

-- Allow public read access for the client view
CREATE POLICY "Public can view gondolas" 
ON public.gondolas 
FOR SELECT 
TO public, anon, authenticated
USING (true);

-- Keep write operations restricted to authenticated users only
-- (insert, update, delete policies remain as they are)