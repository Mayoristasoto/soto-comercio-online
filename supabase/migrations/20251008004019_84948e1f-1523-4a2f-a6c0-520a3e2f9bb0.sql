-- Tabla para almacenar las firmas digitales de los empleados
CREATE TABLE IF NOT EXISTS public.empleados_firmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  firma_data TEXT NOT NULL, -- Base64 de la imagen de la firma
  es_activa BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_empleados_firmas_empleado ON public.empleados_firmas(empleado_id);
CREATE INDEX idx_empleados_firmas_activa ON public.empleados_firmas(empleado_id, es_activa) WHERE es_activa = true;

-- Trigger para updated_at
CREATE TRIGGER update_empleados_firmas_updated_at
  BEFORE UPDATE ON public.empleados_firmas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla para registrar firmas de documentos
CREATE TABLE IF NOT EXISTS public.documentos_firmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos_obligatorios(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  firma_id UUID NOT NULL REFERENCES public.empleados_firmas(id) ON DELETE RESTRICT,
  fecha_firma TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(documento_id, empleado_id, firma_id)
);

-- Índices
CREATE INDEX idx_documentos_firmas_documento ON public.documentos_firmas(documento_id);
CREATE INDEX idx_documentos_firmas_empleado ON public.documentos_firmas(empleado_id);
CREATE INDEX idx_documentos_firmas_fecha ON public.documentos_firmas(fecha_firma);

-- RLS para empleados_firmas
ALTER TABLE public.empleados_firmas ENABLE ROW LEVEL SECURITY;

-- Empleados pueden ver y crear sus propias firmas
CREATE POLICY "Empleados pueden ver sus firmas"
  ON public.empleados_firmas
  FOR SELECT
  USING (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden crear sus firmas"
  ON public.empleados_firmas
  FOR INSERT
  WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden actualizar sus firmas"
  ON public.empleados_firmas
  FOR UPDATE
  USING (empleado_id = get_current_empleado())
  WITH CHECK (empleado_id = get_current_empleado());

-- Admin puede gestionar todas las firmas
CREATE POLICY "Admin puede gestionar firmas"
  ON public.empleados_firmas
  FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- RLS para documentos_firmas
ALTER TABLE public.documentos_firmas ENABLE ROW LEVEL SECURITY;

-- Empleados pueden ver sus propias firmas de documentos
CREATE POLICY "Empleados pueden ver sus firmas de documentos"
  ON public.documentos_firmas
  FOR SELECT
  USING (empleado_id = get_current_empleado());

-- Empleados pueden firmar documentos asignados
CREATE POLICY "Empleados pueden firmar documentos asignados"
  ON public.documentos_firmas
  FOR INSERT
  WITH CHECK (
    empleado_id = get_current_empleado() AND
    EXISTS (
      SELECT 1 FROM asignaciones_documentos_obligatorios ado
      WHERE ado.documento_id = documentos_firmas.documento_id
        AND ado.empleado_id = documentos_firmas.empleado_id
        AND ado.activa = true
    )
  );

-- Admin puede ver todas las firmas de documentos
CREATE POLICY "Admin puede ver todas las firmas de documentos"
  ON public.documentos_firmas
  FOR SELECT
  USING (current_user_is_admin());

-- Gerentes pueden ver firmas de empleados de su sucursal
CREATE POLICY "Gerentes pueden ver firmas de su sucursal"
  ON public.documentos_firmas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados e1
      JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
      WHERE e1.user_id = auth.uid()
        AND e1.rol = 'gerente_sucursal'
        AND e1.activo = true
        AND e2.id = documentos_firmas.empleado_id
    )
  );