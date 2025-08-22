-- Insert admin user credentials (you'll need to sign up with these)
-- This creates a profile entry for the admin user
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  gen_random_uuid(),
  'admin@mayoristasoto.com',
  'Administrador',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'admin@mayoristasoto.com'
);

-- Update RLS policies to allow admin role to manage everything
DROP POLICY IF EXISTS "Authenticated users can view gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users can insert gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users can update gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users can delete gondolas" ON public.gondolas;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- New policies that check for admin role
CREATE POLICY "Admin can view gondolas" 
ON public.gondolas 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Admin can insert gondolas" 
ON public.gondolas 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update gondolas" 
ON public.gondolas 
FOR UPDATE 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete gondolas" 
ON public.gondolas 
FOR DELETE 
TO authenticated 
USING (public.is_admin());