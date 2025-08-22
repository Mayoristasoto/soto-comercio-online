-- CORRECCIÓN DE SEGURIDAD: Eliminar políticas duplicadas y aplicar mejoras

-- 1. Eliminar políticas conflictivas/duplicadas
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent email enumeration attacks" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 2. Crear política INSERT corregida (la que faltaba)
CREATE POLICY "authenticated_users_can_insert_own_profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Función segura para obtener perfil propio (sin exponer otros)
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- 4. Función para verificar rol de admin de forma segura
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 5. Función de auto-creación mejorada con validación
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar que el email no esté vacío
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'Email requerido para crear perfil';
  END IF;
  
  -- Crear perfil automáticamente al registrarse
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

-- 6. Asegurar que el trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Política adicional: Prevenir enumeración de usuarios por email
CREATE POLICY "strict_own_profile_access" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() 
  AND auth.uid() IS NOT NULL
);

-- 8. Log de auditoría de accesos (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS public.profile_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  action text CHECK (action IN ('login', 'profile_view', 'profile_update')),
  timestamp timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- 9. RLS para tabla de auditoría
ALTER TABLE public.profile_access_audit ENABLE ROW LEVEL SECURITY;

-- 10. Solo admins pueden ver logs de auditoría
CREATE POLICY "admins_can_view_audit_logs" 
ON public.profile_access_audit 
FOR SELECT 
TO authenticated
USING (public.current_user_is_admin());