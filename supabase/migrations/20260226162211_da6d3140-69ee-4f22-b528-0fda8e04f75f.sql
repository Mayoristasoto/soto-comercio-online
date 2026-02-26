CREATE TABLE role_dashboard_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL,
  seccion_key TEXT NOT NULL,
  habilitado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rol, seccion_key)
);

ALTER TABLE role_dashboard_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON role_dashboard_sections
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);