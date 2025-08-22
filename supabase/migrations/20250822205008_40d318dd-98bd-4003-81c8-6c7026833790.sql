-- SOLUCIÓN DE SEGURIDAD COMPLETA PARA PERFILES DE USUARIO
-- Proteger información personal y configurar auto-creación segura

-- 1. Agregar política INSERT faltante (crítica para funcionamiento)
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. Crear función de auto-creación de perfiles (SECURITY DEFINER para permisos)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Crear perfil automáticamente al registrarse un usuario
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'user'  -- Rol por defecto
  );
  RETURN NEW;
END;
$$;

-- 3. Crear trigger para auto-creación (si no existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Política adicional de seguridad: Prevenir acceso directo por email
CREATE POLICY "Prevent email enumeration attacks" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id AND 
  auth.uid() IS NOT NULL
);

-- 5. Función para obtener perfil de usuario actual (sin exponer otros)
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
  WHERE p.id = auth.uid();
$$;

-- 6. Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 7. Política estricta: Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.current_user_is_admin());

-- 8. Auditoría: Log de accesos a perfiles (opcional)
CREATE TABLE IF NOT EXISTS public.profile_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_profile_id uuid REFERENCES public.profiles(id),
  accessor_user_id uuid REFERENCES public.profiles(id),
  access_timestamp timestamptz DEFAULT now(),
  access_type text CHECK (access_type IN ('view', 'update'))
);

-- 9. Habilitar RLS en log de auditoría
ALTER TABLE public.profile_access_log ENABLE ROW LEVEL SECURITY;

-- 10. Política para log: Solo admins pueden ver logs
CREATE POLICY "Admins can view access logs" 
ON public.profile_access_log 
FOR SELECT 
TO authenticated
USING (public.current_user_is_admin());