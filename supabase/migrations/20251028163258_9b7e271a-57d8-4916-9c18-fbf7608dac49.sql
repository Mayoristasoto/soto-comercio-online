-- Tabla para registrar infracciones de empleados (Cruces Rojas)
CREATE TABLE IF NOT EXISTS empleado_cruces_rojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo_infraccion TEXT NOT NULL CHECK (tipo_infraccion IN ('llegada_tarde', 'salida_temprana', 'pausa_excedida')),
  fecha_infraccion DATE NOT NULL DEFAULT CURRENT_DATE,
  fichaje_id UUID REFERENCES fichajes(id),
  minutos_diferencia INTEGER,
  observaciones TEXT,
  anulada BOOLEAN DEFAULT FALSE,
  anulada_por UUID REFERENCES empleados(id),
  motivo_anulacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_cruces_rojas_empleado ON empleado_cruces_rojas(empleado_id, fecha_infraccion);
CREATE INDEX IF NOT EXISTS idx_cruces_rojas_fecha ON empleado_cruces_rojas(fecha_infraccion);
CREATE INDEX IF NOT EXISTS idx_cruces_rojas_tipo ON empleado_cruces_rojas(tipo_infraccion);

-- RLS Policies
ALTER TABLE empleado_cruces_rojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empleados pueden ver sus cruces rojas"
ON empleado_cruces_rojas FOR SELECT
USING (empleado_id = get_current_empleado());

CREATE POLICY "Admins pueden gestionar cruces rojas"
ON empleado_cruces_rojas FOR ALL
USING (current_user_is_admin());

CREATE POLICY "Gerentes pueden ver cruces de su sucursal"
ON empleado_cruces_rojas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
    AND e1.rol = 'gerente_sucursal'
    AND e2.id = empleado_cruces_rojas.empleado_id
  )
);

-- Vista para resumen semanal de cruces rojas
CREATE OR REPLACE VIEW empleado_cruces_rojas_semana_actual AS
SELECT 
  ecr.empleado_id,
  e.nombre,
  e.apellido,
  e.avatar_url,
  COUNT(*) FILTER (WHERE ecr.anulada = FALSE) as total_cruces_rojas,
  COUNT(*) FILTER (WHERE ecr.tipo_infraccion = 'llegada_tarde' AND ecr.anulada = FALSE) as llegadas_tarde,
  COUNT(*) FILTER (WHERE ecr.tipo_infraccion = 'salida_temprana' AND ecr.anulada = FALSE) as salidas_tempranas,
  COUNT(*) FILTER (WHERE ecr.tipo_infraccion = 'pausa_excedida' AND ecr.anulada = FALSE) as pausas_excedidas,
  json_agg(
    json_build_object(
      'tipo', ecr.tipo_infraccion,
      'fecha', ecr.fecha_infraccion,
      'minutos', ecr.minutos_diferencia,
      'observaciones', ecr.observaciones
    ) ORDER BY ecr.fecha_infraccion DESC
  ) FILTER (WHERE ecr.anulada = FALSE) as detalles
FROM empleado_cruces_rojas ecr
JOIN empleados e ON e.id = ecr.empleado_id
WHERE ecr.fecha_infraccion >= DATE_TRUNC('week', CURRENT_DATE)
  AND ecr.fecha_infraccion < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY ecr.empleado_id, e.nombre, e.apellido, e.avatar_url;

-- Función demo para insertar cruces rojas de prueba
CREATE OR REPLACE FUNCTION insert_demo_cruces_rojas(p_empleado_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar 3 cruces rojas de ejemplo esta semana
  INSERT INTO empleado_cruces_rojas (empleado_id, tipo_infraccion, fecha_infraccion, minutos_diferencia, observaciones)
  VALUES 
    (p_empleado_id, 'llegada_tarde', CURRENT_DATE, 15, 'Demo: Llegada 15 minutos tarde'),
    (p_empleado_id, 'pausa_excedida', CURRENT_DATE - 1, 10, 'Demo: Pausa excedida 10 minutos'),
    (p_empleado_id, 'llegada_tarde', CURRENT_DATE - 2, 8, 'Demo: Llegada 8 minutos tarde');
END;
$$;