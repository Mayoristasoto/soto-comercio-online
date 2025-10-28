-- Create table to track break time excesses
CREATE TABLE IF NOT EXISTS fichajes_pausas_excedidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_fichaje date NOT NULL,
  hora_inicio_pausa time NOT NULL,
  hora_fin_pausa time NOT NULL,
  duracion_minutos integer NOT NULL,
  duracion_permitida_minutos integer NOT NULL,
  minutos_exceso integer NOT NULL,
  turno_id uuid REFERENCES fichado_turnos(id),
  justificado boolean DEFAULT false,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_pausas_excedidas_empleado_fecha ON fichajes_pausas_excedidas(empleado_id, fecha_fichaje);
CREATE INDEX idx_pausas_excedidas_fecha ON fichajes_pausas_excedidas(fecha_fichaje);

-- Add RLS policies
ALTER TABLE fichajes_pausas_excedidas ENABLE ROW LEVEL SECURITY;

-- Admins can manage all records
CREATE POLICY "Admins can manage pausas excedidas"
  ON fichajes_pausas_excedidas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

-- Employees can view their own records
CREATE POLICY "Empleados pueden ver sus pausas excedidas"
  ON fichajes_pausas_excedidas
  FOR SELECT
  USING (
    empleado_id IN (
      SELECT id FROM empleados
      WHERE user_id = auth.uid()
    )
  );

-- Managers can view their branch records
CREATE POLICY "Gerentes pueden ver pausas excedidas de su sucursal"
  ON fichajes_pausas_excedidas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM empleados e1
      JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
      WHERE e1.user_id = auth.uid()
      AND e1.rol = 'gerente_sucursal'
      AND e1.activo = true
      AND e2.id = fichajes_pausas_excedidas.empleado_id
    )
  );

COMMENT ON TABLE fichajes_pausas_excedidas IS 'Registra excesos en el tiempo de descanso de los empleados';
COMMENT ON COLUMN fichajes_pausas_excedidas.minutos_exceso IS 'Minutos que excedió por encima del tiempo permitido';