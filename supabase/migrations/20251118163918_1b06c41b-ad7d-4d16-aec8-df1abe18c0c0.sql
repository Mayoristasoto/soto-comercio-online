-- Crear tabla para logs de API del sistema comercial
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL, -- 'consulta_saldo', 'acreditacion', 'test_conexion'
  empleado_id UUID REFERENCES public.empleados(id),
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER,
  exitoso BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  duracion_ms INTEGER,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índice para búsquedas por timestamp
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON public.api_logs(timestamp DESC);

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_api_logs_tipo ON public.api_logs(tipo);

-- Crear índice para búsquedas por empleado
CREATE INDEX IF NOT EXISTS idx_api_logs_empleado ON public.api_logs(empleado_id);

-- Enable RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admin_rrhh puede ver logs
CREATE POLICY "Admin RRHH puede ver logs de API"
ON public.api_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Policy: Sistema puede insertar logs
CREATE POLICY "Sistema puede insertar logs de API"
ON public.api_logs
FOR INSERT
WITH CHECK (true);