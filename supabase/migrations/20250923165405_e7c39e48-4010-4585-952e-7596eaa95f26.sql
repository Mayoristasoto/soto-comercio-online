-- Remove the old trigger that's causing conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove the handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- The handle_new_user_empleado function should handle everything now
-- But let's make sure the trigger exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_empleado'
    ) THEN
        CREATE TRIGGER on_auth_user_created_empleado
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_empleado();
    END IF;
END $$;