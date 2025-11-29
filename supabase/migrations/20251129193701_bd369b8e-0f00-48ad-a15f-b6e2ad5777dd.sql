-- Create facial_recognition_logs table to track all facial recognition attempts
CREATE TABLE IF NOT EXISTS public.facial_recognition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  empleado_id UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'login_attempt', 'registration', 'rejection', etc.
  success BOOLEAN NOT NULL DEFAULT false,
  confidence_score NUMERIC(5,2), -- e.g., 0.75 for 75%
  error_message TEXT,
  descriptor_valid BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_facial_logs_created_at ON public.facial_recognition_logs(created_at DESC);
CREATE INDEX idx_facial_logs_empleado_id ON public.facial_recognition_logs(empleado_id);
CREATE INDEX idx_facial_logs_success ON public.facial_recognition_logs(success);
CREATE INDEX idx_facial_logs_event_type ON public.facial_recognition_logs(event_type);

-- Enable RLS
ALTER TABLE public.facial_recognition_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all facial recognition logs"
ON public.facial_recognition_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol = 'admin_rrhh'
    AND empleados.activo = true
  )
);

-- System can insert logs (for edge functions)
CREATE POLICY "System can insert facial recognition logs"
ON public.facial_recognition_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.facial_recognition_logs IS 'Stores all facial recognition authentication attempts for audit and debugging purposes';