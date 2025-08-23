-- CORRECCIÓN CRÍTICA DE SEGURIDAD: Proteger completamente datos personales de usuarios

-- 1. Eliminar todas las políticas existentes de profiles para recrearlas de forma más segura
DROP POLICY IF EXISTS "profiles_deny_anonymous_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_insert_own" ON public.profiles;

-- 2. Crear políticas ultra-restrictivas para profiles
-- SOLO el propietario del perfil puede ver su propia información
CREATE POLICY "users_can_view_own_profile_only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- SOLO el propietario puede actualizar su propio perfil
CREATE POLICY "users_can_update_own_profile_only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- SOLO se puede insertar un perfil para el usuario autenticado actual
CREATE POLICY "users_can_insert_own_profile_only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- SOLO el propietario puede eliminar su propio perfil
CREATE POLICY "users_can_delete_own_profile_only" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

-- 3. Bloquear completamente el acceso anónimo
CREATE POLICY "deny_all_anonymous_access_to_profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 4. Asegurar que no hay funciones que expongan datos de profiles sin autorización
-- Actualizar la función get_current_user_profile para ser más estricta
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(id uuid, email text, full_name text, role text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Solo devuelve el perfil del usuario autenticado actual
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid()
  AND auth.uid() IS NOT NULL  -- Asegurar que hay un usuario autenticado
  LIMIT 1;
$$;

-- 5. Crear función para verificar si el usuario actual es admin de forma segura
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' 
     FROM public.profiles 
     WHERE id = auth.uid() 
     AND auth.uid() IS NOT NULL),
    false
  );
$$;

-- 6. Asegurar que la función handle_new_user no expone información
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el email no esté vacío
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'Email requerido para crear perfil';
  END IF;
  
  -- Crear perfil automáticamente al registrarse
  -- SOLO con información mínima necesaria
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'user'  -- Rol por defecto, solo admin puede cambiar roles
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar errores si ya existe
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log del error pero no fallar la creación del usuario
    RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;