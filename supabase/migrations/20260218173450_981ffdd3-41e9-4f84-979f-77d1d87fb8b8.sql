
-- Add special schedule columns to dias_feriados
ALTER TABLE dias_feriados 
ADD COLUMN IF NOT EXISTS desactivar_controles BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hora_entrada_especial TIME,
ADD COLUMN IF NOT EXISTS tolerancia_especial_min INTEGER,
ADD COLUMN IF NOT EXISTS pausa_especial_min INTEGER;

-- Create config for Sundays (and potentially other special day types)
CREATE TABLE IF NOT EXISTS config_dias_especiales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL UNIQUE,
  desactivar_controles BOOLEAN DEFAULT false,
  hora_entrada_especial TIME,
  tolerancia_especial_min INTEGER DEFAULT 15,
  pausa_especial_min INTEGER DEFAULT 40,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default Sunday config
INSERT INTO config_dias_especiales (tipo, desactivar_controles, tolerancia_especial_min, pausa_especial_min, activo) 
VALUES ('domingo', true, 15, 40, true)
ON CONFLICT (tipo) DO NOTHING;

-- RLS
ALTER TABLE config_dias_especiales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read config_dias_especiales" 
ON config_dias_especiales FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin can insert config_dias_especiales" 
ON config_dias_especiales FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin can update config_dias_especiales" 
ON config_dias_especiales FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Admin can delete config_dias_especiales" 
ON config_dias_especiales FOR DELETE 
TO authenticated
USING (true);
