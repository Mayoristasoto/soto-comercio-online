-- Tabla para registrar logs de actividad de tareas
CREATE TABLE public.tareas_actividad_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  tipo_actividad TEXT NOT NULL CHECK (tipo_actividad IN (
    'impresa',
    'consultada',
    'iniciada',
    'completada',
    'alerta_vencimiento_mostrada',
    'confirmacion_salida_mostrada',
    'omitida_salida',
    'delegada',
    'recibida'
  )),
  dispositivo TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejor performance en consultas
CREATE INDEX idx_tareas_actividad_log_tarea ON public.tareas_actividad_log(tarea_id);
CREATE INDEX idx_tareas_actividad_log_empleado ON public.tareas_actividad_log(empleado_id);
CREATE INDEX idx_tareas_actividad_log_fecha ON public.tareas_actividad_log(created_at DESC);
CREATE INDEX idx_tareas_actividad_log_tipo ON public.tareas_actividad_log(tipo_actividad);

-- Habilitar RLS
ALTER TABLE public.tareas_actividad_log ENABLE ROW LEVEL SECURITY;

-- Política para insertar logs (cualquier usuario autenticado puede registrar actividad)
CREATE POLICY "Usuarios pueden insertar logs de tareas"
ON public.tareas_actividad_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para leer logs (usuarios pueden ver logs de sus propias tareas o de tareas que les asignaron)
CREATE POLICY "Usuarios pueden ver logs de sus tareas"
ON public.tareas_actividad_log
FOR SELECT
TO authenticated
USING (
  empleado_id IN (
    SELECT id FROM public.empleados 
    WHERE user_id = auth.uid()
  )
  OR tarea_id IN (
    SELECT id FROM public.tareas 
    WHERE asignado_a IN (
      SELECT id FROM public.empleados 
      WHERE user_id = auth.uid()
    )
    OR asignado_por IN (
      SELECT id FROM public.empleados 
      WHERE user_id = auth.uid()
    )
  )
);

-- Comentarios para documentación
COMMENT ON TABLE public.tareas_actividad_log IS 'Registro de todas las actividades relacionadas con tareas: impresiones, consultas, completados, etc.';
COMMENT ON COLUMN public.tareas_actividad_log.tipo_actividad IS 'Tipo de actividad: impresa, consultada, iniciada, completada, alerta_vencimiento_mostrada, confirmacion_salida_mostrada, omitida_salida, delegada, recibida';
COMMENT ON COLUMN public.tareas_actividad_log.dispositivo IS 'Dispositivo desde donde se realizó la acción: kiosco, kiosco_autogestion, web';
COMMENT ON COLUMN public.tareas_actividad_log.metadata IS 'Datos adicionales en formato JSON como nombre del empleado, sucursal, etc.';