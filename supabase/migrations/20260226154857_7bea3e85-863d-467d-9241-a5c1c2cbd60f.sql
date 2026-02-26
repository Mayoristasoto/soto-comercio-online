ALTER TABLE asignaciones_especiales 
ADD COLUMN IF NOT EXISTS confirmado_por UUID REFERENCES empleados(id),
ADD COLUMN IF NOT EXISTS confirmado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS costo_hora_estimado NUMERIC;