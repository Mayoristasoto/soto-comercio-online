-- Tabla para configurar qué empleados participan en Desafíos TV
CREATE TABLE IF NOT EXISTS desafios_tv_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  participa boolean NOT NULL DEFAULT true,
  motivo_exclusion text,
  configurado_por uuid REFERENCES empleados(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empleado_id)
);

-- Índices
CREATE INDEX idx_desafios_tv_participantes_empleado ON desafios_tv_participantes(empleado_id);
CREATE INDEX idx_desafios_tv_participantes_participa ON desafios_tv_participantes(participa);

-- RLS Policies
ALTER TABLE desafios_tv_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede gestionar participantes TV"
  ON desafios_tv_participantes
  FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Usuarios autenticados pueden ver participantes activos"
  ON desafios_tv_participantes
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND participa = true);

-- Trigger para updated_at
CREATE TRIGGER update_desafios_tv_participantes_updated_at
  BEFORE UPDATE ON desafios_tv_participantes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();