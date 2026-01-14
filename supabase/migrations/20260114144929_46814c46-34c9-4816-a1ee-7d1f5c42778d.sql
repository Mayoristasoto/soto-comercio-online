-- Modificar tabla tareas para permitir asignación a sucursales
ALTER TABLE public.tareas 
  ALTER COLUMN asignado_a DROP NOT NULL;

ALTER TABLE public.tareas 
  ADD COLUMN IF NOT EXISTS tipo_asignacion text DEFAULT 'empleado' CHECK (tipo_asignacion IN ('empleado', 'sucursal'));

-- Crear tabla para asignaciones múltiples a sucursales
CREATE TABLE IF NOT EXISTS public.tareas_sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id),
  gerente_id uuid REFERENCES public.empleados(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tarea_id, sucursal_id)
);

-- Habilitar RLS
ALTER TABLE public.tareas_sucursales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tareas_sucursales
CREATE POLICY "Admin RRHH puede ver todas las asignaciones de sucursales"
ON public.tareas_sucursales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
  )
);

CREATE POLICY "Gerentes pueden ver asignaciones de sus sucursales"
ON public.tareas_sucursales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.id = gerente_id
  )
);

CREATE POLICY "Admin RRHH puede crear asignaciones de sucursales"
ON public.tareas_sucursales
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
  )
);

CREATE POLICY "Admin RRHH puede eliminar asignaciones de sucursales"
ON public.tareas_sucursales
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
  )
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_tareas_sucursales_tarea ON public.tareas_sucursales(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tareas_sucursales_sucursal ON public.tareas_sucursales(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_tareas_sucursales_gerente ON public.tareas_sucursales(gerente_id);
CREATE INDEX IF NOT EXISTS idx_tareas_tipo_asignacion ON public.tareas(tipo_asignacion);