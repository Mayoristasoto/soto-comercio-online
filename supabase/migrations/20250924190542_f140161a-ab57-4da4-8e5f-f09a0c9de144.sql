-- Eliminar el trigger problemático primero, luego la función
DROP TRIGGER IF EXISTS on_auth_user_created_empleado ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_empleado() CASCADE;