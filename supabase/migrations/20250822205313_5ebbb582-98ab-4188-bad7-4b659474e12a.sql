-- CORRECCIÓN FINAL DE SEGURIDAD: Eliminar políticas redundantes y optimizar

-- 1. Eliminar política redundante (ya tenemos "Users can view own profile" que es suficiente)
DROP POLICY IF EXISTS "strict_own_profile_access" ON public.profiles;

-- 2. Función segura para obtener perfil propio (ya creada anteriormente)
-- Esta función ya existe y está correcta

-- 3. Función para verificar admin (ya creada anteriormente)  
-- Esta función ya existe y está correcta

-- 4. Trigger de auto-creación (ya creado anteriormente)
-- Este trigger ya existe y está correcto

-- 5. Crear tabla de auditoría si no existe (mejorada)
CREATE TABLE IF NOT EXISTS public.profile_security_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text CHECK (event_type IN ('profile_access', 'profile_update', 'suspicious_activity')),
  event_details jsonb,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

-- 6. RLS en tabla de log
ALTER TABLE public.profile_security_log ENABLE ROW LEVEL SECURITY;

-- 7. Solo admins pueden ver logs de seguridad
CREATE POLICY "security_logs_admin_only" 
ON public.profile_security_log 
FOR ALL
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- 8. Función para registrar accesos sospechosos
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_details jsonb DEFAULT '{}',
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profile_security_log (
    user_id, event_type, event_details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_event_type, p_details, p_ip, p_user_agent
  );
END;
$$;

-- 9. Verificar que RLS está habilitado en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 10. Función para obtener estadísticas de perfiles (solo para admins)
CREATE OR REPLACE FUNCTION public.get_profile_stats()
RETURNS TABLE (
  total_users bigint,
  active_users bigint,
  admin_users bigint
) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at > now() - interval '30 days' THEN 1 END) as active_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
  FROM public.profiles
  WHERE public.current_user_is_admin(); -- Solo ejecuta si es admin
$$;