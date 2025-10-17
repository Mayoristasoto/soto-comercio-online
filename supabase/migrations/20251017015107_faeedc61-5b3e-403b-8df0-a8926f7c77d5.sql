-- Tabla para registro de entregas de elementos a empleados
CREATE TABLE public.entregas_elementos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  entregado_por UUID NOT NULL REFERENCES public.empleados(id),
  tipo_elemento TEXT NOT NULL, -- 'remera', 'buzo', 'zapatos', 'pantalon', 'chaleco', 'otro'
  descripcion TEXT,
  talla TEXT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'confirmado'
  fecha_entrega TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_confirmacion TIMESTAMP WITH TIME ZONE,
  firma_empleado TEXT, -- Base64 de la firma
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entregas_elementos ENABLE ROW LEVEL SECURITY;

-- Admins pueden gestionar todas las entregas
CREATE POLICY "Admins can manage all entregas"
ON public.entregas_elementos
FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Empleados pueden ver sus propias entregas
CREATE POLICY "Employees can view their own entregas"
ON public.entregas_elementos
FOR SELECT
USING (empleado_id = get_current_empleado());

-- Empleados pueden actualizar confirmación de sus entregas
CREATE POLICY "Employees can confirm their entregas"
ON public.entregas_elementos
FOR UPDATE
USING (empleado_id = get_current_empleado() AND estado = 'pendiente')
WITH CHECK (empleado_id = get_current_empleado());

-- Trigger para updated_at
CREATE TRIGGER update_entregas_elementos_updated_at
BEFORE UPDATE ON public.entregas_elementos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Índices para mejorar performance
CREATE INDEX idx_entregas_elementos_empleado ON public.entregas_elementos(empleado_id);
CREATE INDEX idx_entregas_elementos_estado ON public.entregas_elementos(estado);
CREATE INDEX idx_entregas_elementos_fecha ON public.entregas_elementos(fecha_entrega DESC);