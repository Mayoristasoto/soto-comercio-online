-- Crear tipo enum para las categorías de anotaciones
CREATE TYPE anotacion_categoria AS ENUM (
  'apercibimiento',
  'llamado_atencion',
  'orden_no_acatada',
  'no_uso_uniforme',
  'uso_celular',
  'tardanza',
  'ausencia_injustificada',
  'actitud_positiva',
  'mejora_desempeno',
  'otro'
);

-- Crear tabla de anotaciones de empleados
CREATE TABLE public.empleados_anotaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  creado_por UUID NOT NULL REFERENCES public.empleados(id) ON DELETE RESTRICT,
  categoria anotacion_categoria NOT NULL,
  fecha_anotacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  requiere_seguimiento BOOLEAN DEFAULT false,
  seguimiento_completado BOOLEAN DEFAULT false,
  fecha_seguimiento TIMESTAMP WITH TIME ZONE,
  es_critica BOOLEAN DEFAULT false,
  archivos_adjuntos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_empleados_anotaciones_empleado ON public.empleados_anotaciones(empleado_id);
CREATE INDEX idx_empleados_anotaciones_creador ON public.empleados_anotaciones(creado_por);
CREATE INDEX idx_empleados_anotaciones_categoria ON public.empleados_anotaciones(categoria);
CREATE INDEX idx_empleados_anotaciones_fecha ON public.empleados_anotaciones(fecha_anotacion DESC);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_empleados_anotaciones_updated_at
  BEFORE UPDATE ON public.empleados_anotaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.empleados_anotaciones ENABLE ROW LEVEL SECURITY;

-- Política: Admin RRHH puede ver todas las anotaciones
CREATE POLICY "Admin puede ver todas las anotaciones"
  ON public.empleados_anotaciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

-- Política: Admin RRHH puede crear anotaciones para cualquier empleado
CREATE POLICY "Admin puede crear anotaciones"
  ON public.empleados_anotaciones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

-- Política: Admin RRHH puede actualizar cualquier anotación
CREATE POLICY "Admin puede actualizar anotaciones"
  ON public.empleados_anotaciones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

-- Política: Admin RRHH puede eliminar anotaciones
CREATE POLICY "Admin puede eliminar anotaciones"
  ON public.empleados_anotaciones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

-- Política: Gerentes pueden ver solo las anotaciones que ellos crearon
CREATE POLICY "Gerentes pueden ver sus propias anotaciones"
  ON public.empleados_anotaciones
  FOR SELECT
  USING (
    creado_por = get_current_empleado()
    AND EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'gerente_sucursal'
      AND e.activo = true
    )
  );

-- Política: Gerentes pueden crear anotaciones solo para empleados de su sucursal
CREATE POLICY "Gerentes pueden crear anotaciones de su sucursal"
  ON public.empleados_anotaciones
  FOR INSERT
  WITH CHECK (
    creado_por = get_current_empleado()
    AND EXISTS (
      SELECT 1 FROM empleados e_gerente
      JOIN empleados e_empleado ON e_gerente.sucursal_id = e_empleado.sucursal_id
      WHERE e_gerente.user_id = auth.uid()
      AND e_gerente.rol = 'gerente_sucursal'
      AND e_gerente.activo = true
      AND e_empleado.id = empleados_anotaciones.empleado_id
    )
  );

-- Política: Gerentes pueden actualizar solo sus propias anotaciones
CREATE POLICY "Gerentes pueden actualizar sus anotaciones"
  ON public.empleados_anotaciones
  FOR UPDATE
  USING (
    creado_por = get_current_empleado()
    AND EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'gerente_sucursal'
      AND e.activo = true
    )
  );

-- Política: Gerentes pueden eliminar solo sus propias anotaciones
CREATE POLICY "Gerentes pueden eliminar sus anotaciones"
  ON public.empleados_anotaciones
  FOR DELETE
  USING (
    creado_por = get_current_empleado()
    AND EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'gerente_sucursal'
      AND e.activo = true
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE public.empleados_anotaciones IS 'Registro de anotaciones y observaciones sobre empleados';
COMMENT ON COLUMN public.empleados_anotaciones.categoria IS 'Categoría de la anotación (apercibimiento, llamado de atención, etc.)';
COMMENT ON COLUMN public.empleados_anotaciones.es_critica IS 'Indica si la anotación es crítica y requiere atención inmediata';
COMMENT ON COLUMN public.empleados_anotaciones.requiere_seguimiento IS 'Indica si la anotación requiere un seguimiento posterior';