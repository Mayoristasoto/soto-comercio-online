-- Tabla para notas del calendario
CREATE TABLE calendario_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  creado_por UUID REFERENCES empleados(id),
  tipo TEXT NOT NULL DEFAULT 'general' CHECK (tipo IN ('general', 'recordatorio', 'importante')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para cambios de horario excepcionales
CREATE TABLE horarios_excepcionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  fecha DATE NOT NULL,
  hora_entrada TIME,
  hora_salida TIME,
  motivo TEXT NOT NULL,
  aprobado_por UUID REFERENCES empleados(id),
  creado_por UUID REFERENCES empleados(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_calendario_notas_fecha ON calendario_notas(fecha);
CREATE INDEX idx_horarios_excepcionales_fecha ON horarios_excepcionales(fecha);
CREATE INDEX idx_horarios_excepcionales_empleado ON horarios_excepcionales(empleado_id);

-- RLS para calendario_notas
ALTER TABLE calendario_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y gerentes pueden gestionar notas calendario"
ON calendario_notas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol IN ('admin_rrhh', 'gerente_sucursal')
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol IN ('admin_rrhh', 'gerente_sucursal')
    AND e.activo = true
  )
);

CREATE POLICY "Usuarios autenticados pueden ver notas activas"
ON calendario_notas
FOR SELECT
USING (auth.uid() IS NOT NULL AND activo = true);

-- RLS para horarios_excepcionales
ALTER TABLE horarios_excepcionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden gestionar todos los horarios excepcionales"
ON horarios_excepcionales
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

CREATE POLICY "Gerentes pueden gestionar horarios de su sucursal"
ON horarios_excepcionales
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = horarios_excepcionales.empleado_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = horarios_excepcionales.empleado_id
  )
);

CREATE POLICY "Empleados pueden ver sus horarios excepcionales"
ON horarios_excepcionales
FOR SELECT
USING (
  empleado_id IN (
    SELECT id FROM empleados WHERE user_id = auth.uid()
  )
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendario_notas_updated_at
BEFORE UPDATE ON calendario_notas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_horarios_excepcionales_updated_at
BEFORE UPDATE ON horarios_excepcionales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();