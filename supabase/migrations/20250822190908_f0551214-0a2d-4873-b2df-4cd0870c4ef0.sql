-- Remove all existing policies on gondolas table
DROP POLICY IF EXISTS "Authenticated users can view gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users can insert gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users can update gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users can delete gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Admin can view gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Admin can insert gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Admin can update gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Admin can delete gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Anyone can manage gondolas" ON public.gondolas;

-- Ensure RLS is enabled
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies that ONLY allow authenticated users
CREATE POLICY "Authenticated users only - view gondolas" 
ON public.gondolas 
FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only - insert gondolas" 
ON public.gondolas 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only - update gondolas" 
ON public.gondolas 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only - delete gondolas" 
ON public.gondolas 
FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Explicitly deny public access
REVOKE ALL ON public.gondolas FROM public;
REVOKE ALL ON public.gondolas FROM anon;