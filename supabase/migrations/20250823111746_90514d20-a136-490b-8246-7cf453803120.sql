-- Add explicit deny policy for unauthenticated users on profiles table
-- This prevents any unauthenticated access to the profiles table

CREATE POLICY "deny_unauthenticated_access" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

-- Also ensure authenticated users can only access their own data
-- (the existing policies already handle this, but let's be explicit about anon role)

-- Verify current policies are working as expected by checking they only apply to authenticated role
-- The existing policies should already restrict access to auth.uid() = id