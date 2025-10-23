-- Tabla para almacenar calificaciones de empleados desde facturas
CREATE TABLE IF NOT EXISTS public.calificaciones_empleados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL,
  venta_id TEXT,
  calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  fecha_calificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  token_usado TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_calificaciones_empleado ON public.calificaciones_empleados(empleado_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_token ON public.calificaciones_empleados(token_usado);

-- RLS Policies
ALTER TABLE public.calificaciones_empleados ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar una calificación (página pública)
CREATE POLICY "Público puede crear calificaciones"
ON public.calificaciones_empleados
FOR INSERT
WITH CHECK (true);

-- Empleados pueden ver sus propias calificaciones
CREATE POLICY "Empleados pueden ver sus calificaciones"
ON public.calificaciones_empleados
FOR SELECT
USING (empleado_id = get_current_empleado());

-- Admins pueden ver todas las calificaciones
CREATE POLICY "Admins pueden ver todas las calificaciones"
ON public.calificaciones_empleados
FOR SELECT
USING (current_user_is_admin());

-- Gerentes pueden ver calificaciones de su sucursal
CREATE POLICY "Gerentes pueden ver calificaciones de su sucursal"
ON public.calificaciones_empleados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = calificaciones_empleados.empleado_id
  )
);