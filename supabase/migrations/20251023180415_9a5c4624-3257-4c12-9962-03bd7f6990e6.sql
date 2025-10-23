-- Crear política para permitir insertar logs de autenticación
DROP POLICY IF EXISTS "Sistema puede insertar logs de autenticación" ON public.auth_logs;

CREATE POLICY "Sistema puede insertar logs de autenticación"
ON public.auth_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Eliminar la función existente especificando la lista exacta de argumentos
DROP FUNCTION IF EXISTS public.registrar_intento_login(text, text, text, boolean, text, uuid, jsonb);

-- Recrear la función con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.registrar_intento_login(
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_evento TEXT DEFAULT 'login_intento',
  p_metodo TEXT DEFAULT 'email_password',
  p_exitoso BOOLEAN DEFAULT false,
  p_mensaje_error TEXT DEFAULT NULL,
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