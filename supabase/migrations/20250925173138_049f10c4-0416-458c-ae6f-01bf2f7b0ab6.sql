-- MINIMAL FIX: Just drop the problematic function
-- The previous migrations should have removed the dependencies

DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

-- Verify it's gone and check for remaining SECURITY DEFINER issues
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE prosecdef = true 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname NOT LIKE 'handle_%'
AND proname NOT LIKE 'update_%'
AND proname NOT LIKE 'create_%'
AND proname NOT LIKE 'sync_%'
AND proname NOT LIKE 'log_%'
ORDER BY proname;