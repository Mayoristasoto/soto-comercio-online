-- Tabla para configuración del sistema comercial
CREATE TABLE IF NOT EXISTS public.sistema_comercial_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT,
  api_token TEXT,
  endpoint_acreditacion TEXT DEFAULT '/api/empleados/acreditar',
  habilitado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO public.sistema_comercial_config (api_url, habilitado) 
VALUES (NULL, false)
ON CONFLICT DO NOTHING;

-- RLS para sistema_comercial_config
ALTER TABLE public.sistema_comercial_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admins pueden gestionar config comercial"
ON public.sistema_comercial_config
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Actualizar tabla asignaciones_premio para tracking de acreditaciones
ALTER TABLE public.asignaciones_premio 
ADD COLUMN IF NOT EXISTS acreditado_sistema_comercial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_acreditacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS respuesta_sistema_comercial JSONB;