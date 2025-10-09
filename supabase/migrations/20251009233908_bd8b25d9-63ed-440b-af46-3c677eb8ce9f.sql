-- Crear tabla de solicitudes para adelantos y otros tipos de solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'adelanto', 'vacaciones', 'permiso', etc.
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aprobada', 'rechazada'
  monto_solicitado NUMERIC(12,2),
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_respuesta TIMESTAMP WITH TIME ZONE,
  respondido_por UUID REFERENCES public.empleados(id),
  descripcion TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- Política: Empleados pueden crear sus propias solicitudes
CREATE POLICY "Empleados pueden crear sus solicitudes"
ON public.solicitudes
FOR INSERT
WITH CHECK (empleado_id IN (
  SELECT id FROM public.empleados WHERE user_id = auth.uid()
));

-- Política: Empleados pueden ver sus propias solicitudes
CREATE POLICY "Empleados pueden ver sus solicitudes"
ON public.solicitudes
FOR SELECT
USING (empleado_id IN (
  SELECT id FROM public.empleados WHERE user_id = auth.uid()
));

-- Política: Admins pueden gestionar todas las solicitudes
CREATE POLICY "Admins pueden gestionar solicitudes"
ON public.solicitudes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh' 
    AND activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh' 
    AND activo = true
  )
);

-- Política: Gerentes pueden ver solicitudes de su sucursal
CREATE POLICY "Gerentes pueden ver solicitudes de su sucursal"
ON public.solicitudes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.empleados e1
    JOIN public.empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = solicitudes.empleado_id
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_solicitudes_updated_at
BEFORE UPDATE ON public.solicitudes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();