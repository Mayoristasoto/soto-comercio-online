-- Eliminar TODAS las variantes de la función registrar_intento_login
DROP FUNCTION IF EXISTS public.registrar_intento_login(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.registrar_intento_login(TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, JSONB);

-- Recrear la función con SECURITY DEFINER para bypass RLS
CREATE FUNCTION public.registrar_intento_login(
  p_email TEXT,
  p_evento TEXT,
  p_metodo TEXT DEFAULT 'email_password',
  p_exitoso BOOLEAN DEFAULT false,
  p_mensaje_error TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_datos_adicionales JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_log_id UUID;
BEGIN
  INSERT INTO public.auth_logs (
    user_id,
    email,
    evento,
    metodo,
    ip_address,
    exitoso,
    mensaje_error,
    datos_adicionales,
    timestamp
  ) VALUES (
    p_user_id,
    p_email,
    p_evento,
    p_metodo,
    inet_client_addr(),
    p_exitoso,
    p_mensaje_error,
    COALESCE(p_datos_adicionales, '{}'::jsonb),
    now()
  )
  RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;

COMMENT ON FUNCTION public.registrar_intento_login IS 'Registra intentos de inicio de sesión con SECURITY DEFINER para bypass RLS';