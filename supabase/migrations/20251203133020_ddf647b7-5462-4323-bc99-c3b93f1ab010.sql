-- Tabla para registrar cambios de horario solicitados por gerentes
CREATE TABLE public.cambios_horario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  solicitado_por UUID NOT NULL REFERENCES empleados(id),
  fecha DATE NOT NULL,
  tipo_cambio TEXT NOT NULL CHECK (tipo_cambio IN ('manual', 'intercambio')),
  
  -- Para cambio manual
  hora_entrada_nueva TIME,
  hora_salida_nueva TIME,
  
  -- Para intercambio con otro empleado
  empleado_intercambio_id UUID REFERENCES empleados(id),
  
  justificacion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'aprobado' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_cambios_horario_empleado ON cambios_horario(empleado_id);
CREATE INDEX idx_cambios_horario_fecha ON cambios_horario(fecha);
CREATE INDEX idx_cambios_horario_solicitado_por ON cambios_horario(solicitado_por);

-- RLS
ALTER TABLE cambios_horario ENABLE ROW LEVEL SECURITY;

-- Gerentes pueden crear cambios para empleados de su sucursal
CREATE POLICY "Gerentes pueden crear cambios de horario"
ON cambios_horario FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e_manager
    JOIN empleados e_target ON e_manager.sucursal_id = e_target.sucursal_id
    WHERE e_manager.user_id = auth.uid()
    AND e_manager.rol IN ('gerente_sucursal', 'admin_rrhh')
    AND e_manager.activo = true
    AND e_target.id = empleado_id
    AND e_target.rol IN ('empleado', 'gerente_sucursal')
  )
);

-- Gerentes pueden ver cambios de su sucursal
CREATE POLICY "Gerentes pueden ver cambios de su sucursal"
ON cambios_horario FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados e_manager
    JOIN empleados e_target ON e_manager.sucursal_id = e_target.sucursal_id
    WHERE e_manager.user_id = auth.uid()
    AND e_manager.rol IN ('gerente_sucursal', 'admin_rrhh')
    AND e_manager.activo = true
    AND e_target.id = empleado_id
  )
  OR empleado_id = get_current_empleado()
);

-- Admins pueden gestionar todos los cambios
CREATE POLICY "Admins pueden gestionar cambios"
ON cambios_horario FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_cambios_horario_updated_at
BEFORE UPDATE ON cambios_horario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();