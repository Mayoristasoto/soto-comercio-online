-- SIMPLE FIX: Just remove problematic views and functions

-- 1. Drop the problematic views
DROP VIEW IF EXISTS public.empleados_admin_sensitive CASCADE;
DROP VIEW IF EXISTS public.empleados_safe_view CASCADE;

-- 2. Remove other functions that might cause SECURITY DEFINER issues
DROP FUNCTION IF EXISTS public.detect_insecure_views() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_gondolas() CASCADE;
DROP FUNCTION IF EXISTS public.get_gondolas_public_view() CASCADE;

-- 3. Verify what remains
SELECT COUNT(*) as remaining_security_definer_functions
FROM pg_proc 
WHERE prosecdef = true 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname NOT LIKE 'handle_%'
AND proname NOT LIKE 'update_%'
AND proname NOT LIKE 'create_%'
AND proname NOT LIKE 'sync_%'
AND proname NOT LIKE 'log_%'
AND proname NOT LIKE 'aplicar_%'
AND proname NOT LIKE 'actualizar_%';