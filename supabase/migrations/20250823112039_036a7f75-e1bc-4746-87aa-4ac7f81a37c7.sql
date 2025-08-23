-- Ensure RLS is enabled on profiles table (should already be enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop the previous deny policy to create a more specific one
DROP POLICY IF EXISTS "deny_unauthenticated_access" ON public.profiles;

-- Create more explicit restrictive policies
-- First, explicitly deny all access to unauthenticated users (anon role)
CREATE POLICY "profiles_deny_anonymous_all" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

-- Ensure existing authenticated policies are more restrictive  
-- Recreate the view policy to be more explicit
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "profiles_authenticated_view_own" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Recreate update policy to be more explicit
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "profiles_authenticated_update_own" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Recreate insert policy to be more explicit
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_profile" ON public.profiles;
CREATE POLICY "profiles_authenticated_insert_own" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);