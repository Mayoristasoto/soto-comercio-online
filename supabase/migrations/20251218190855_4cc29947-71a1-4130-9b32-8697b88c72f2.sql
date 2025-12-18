-- Crear tabla para asignaciones especiales (domingos y feriados)
CREATE TABLE public.asignaciones_especiales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('domingo', 'feriado')),
  hora_entrada TIME NOT NULL DEFAULT '09:00:00',
  hora_salida TIME NOT NULL DEFAULT '18:00:00',
  creado_por UUID REFERENCES public.empleados(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, fecha, tipo)
);

-- Habilitar RLS
ALTER TABLE public.asignaciones_especiales ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Usuarios autenticados pueden ver asignaciones especiales"
ON public.asignaciones_especiales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar asignaciones especiales"
ON public.asignaciones_especiales
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones especiales"
ON public.asignaciones_especiales
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar asignaciones especiales"
ON public.asignaciones_especiales
FOR DELETE
TO authenticated
USING (true);

-- Índices
CREATE INDEX idx_asignaciones_especiales_fecha ON public.asignaciones_especiales(fecha);
CREATE INDEX idx_asignaciones_especiales_tipo ON public.asignaciones_especiales(tipo);
CREATE INDEX idx_asignaciones_especiales_empleado ON public.asignaciones_especiales(empleado_id);