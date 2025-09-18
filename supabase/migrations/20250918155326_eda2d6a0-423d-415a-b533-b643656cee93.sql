-- Unificar sistema de usuarios con empleados
-- Eliminar tabla profiles ya que empleados cumple esa función

-- Primero, eliminar las políticas de la tabla profiles
DROP POLICY IF EXISTS "deny_all_anonymous_access_to_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_delete_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile_only" ON public.profiles;

-- Eliminar funciones relacionadas con profiles
DROP FUNCTION IF EXISTS public.get_current_user_profile();
DROP FUNCTION IF EXISTS public.current_user_is_admin();
DROP FUNCTION IF EXISTS public.get_profile_stats();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Eliminar tablas de logs de profiles
DROP TABLE IF EXISTS public.profile_access_log;
DROP TABLE IF EXISTS public.profile_security_log;
DROP TABLE IF EXISTS public.profile_access_audit;

-- Eliminar tabla profiles
DROP TABLE IF EXISTS public.profiles;

-- Mejorar el trigger de empleados para crear automáticamente empleado al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Verificar si ya existe un empleado con este email
  IF NOT EXISTS (SELECT 1 FROM public.empleados WHERE email = NEW.email) THEN
    INSERT INTO public.empleados (
      user_id,
      nombre,
      apellido,
      email,
      rol,
      fecha_ingreso,
      activo
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nombre', 'Nuevo'),
      COALESCE(NEW.raw_user_meta_data ->> 'apellido', 'Usuario'),
      NEW.email,
      'empleado',  -- Por defecto todos son empleados
      CURRENT_DATE,
      true
    );
  ELSE
    -- Si ya existe empleado con este email, solo actualizar user_id
    UPDATE public.empleados 
    SET user_id = NEW.id 
    WHERE email = NEW.email AND user_id IS NULL;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando empleado para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Asegurar que el trigger esté activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_empleado();

-- Crear función helper para obtener empleado actual
CREATE OR REPLACE FUNCTION public.get_current_empleado_full()
RETURNS TABLE(
  id uuid,
  nombre text,
  apellido text,
  email text,
  rol user_role,
  sucursal_id uuid,
  grupo_id uuid,
  activo boolean,
  fecha_ingreso date,
  avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    e.id,
    e.nombre,
    e.apellido,
    e.email,
    e.rol,
    e.sucursal_id,
    e.grupo_id,
    e.activo,
    e.fecha_ingreso,
    e.avatar_url
  FROM public.empleados e
  WHERE e.user_id = auth.uid()
  AND auth.uid() IS NOT NULL
  LIMIT 1;
$function$;

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT COALESCE(
    (SELECT rol = 'admin_rrhh' 
     FROM public.empleados 
     WHERE user_id = auth.uid() 
     AND auth.uid() IS NOT NULL 
     AND activo = true),
    false
  );
$function$;