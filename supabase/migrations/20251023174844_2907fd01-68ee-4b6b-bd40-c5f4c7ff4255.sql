-- Crear tabla para logs de autenticación
CREATE TABLE IF NOT EXISTS public.auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  evento TEXT NOT NULL, -- 'login_exitoso', 'login_fallido', 'logout', 'intento_facial'
  metodo TEXT, -- 'email_password', 'facial', 'token_refresh'
  ip_address INET,
  user_agent TEXT,
  datos_adicionales JSONB DEFAULT '{}'::jsonb,
  exitoso BOOLEAN NOT NULL DEFAULT false,
  mensaje_error TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX idx_auth_logs_email ON public.auth_logs(email);
CREATE INDEX idx_auth_logs_timestamp ON public.auth_logs(timestamp DESC);
CREATE INDEX idx_auth_logs_exitoso ON public.auth_logs(exitoso);
CREATE INDEX idx_auth_logs_evento ON public.auth_logs(evento);

-- Habilitar RLS
ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo admin_rrhh puede ver los logs
CREATE POLICY "Solo admin_rrhh puede ver logs de autenticación"
  ON public.auth_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE user_id = auth.uid()
      AND rol = 'admin_rrhh'
      AND activo = true
    )
  );

-- Función para registrar intentos de login
CREATE OR REPLACE FUNCTION public.registrar_intento_login(
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
    p_datos_adicionales,
    now()
  )
  RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;

-- Comentarios
COMMENT ON TABLE public.auth_logs IS 'Registro de todos los intentos de autenticación en el sistema';
COMMENT ON COLUMN public.auth_logs.evento IS 'Tipo de evento: login_exitoso, login_fallido, logout, intento_facial';
COMMENT ON COLUMN public.auth_logs.metodo IS 'Método de autenticación: email_password, facial, token_refresh';