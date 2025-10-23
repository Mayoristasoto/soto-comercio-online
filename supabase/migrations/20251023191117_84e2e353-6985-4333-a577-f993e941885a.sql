-- Función para registrar intentos de login con captura automática de IP
CREATE OR REPLACE FUNCTION public.registrar_intento_login(
  p_email TEXT,
  p_evento TEXT,
  p_metodo TEXT,
  p_exitoso BOOLEAN,
  p_user_id UUID DEFAULT NULL,
  p_mensaje_error TEXT DEFAULT NULL,
  p_datos_adicionales JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_logs (
    user_id,
    email,
    evento,
    metodo,
    exitoso,
    mensaje_error,
    ip_address,
    user_agent,
    datos_adicionales,
    timestamp
  ) VALUES (
    p_user_id,
    p_email,
    p_evento,
    p_metodo,
    p_exitoso,
    p_mensaje_error,
    inet_client_addr(), -- Captura automática de IP del cliente
    current_setting('request.headers', true)::json->>'user-agent', -- Captura user agent si está disponible
    p_datos_adicionales,
    now()
  );
END;
$$;