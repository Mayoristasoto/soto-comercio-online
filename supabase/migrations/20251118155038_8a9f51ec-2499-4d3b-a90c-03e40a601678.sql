-- Actualizar la tabla sistema_comercial_config para incluir los campos de variables de entorno de Centum
ALTER TABLE sistema_comercial_config
ADD COLUMN IF NOT EXISTS centum_base_url TEXT,
ADD COLUMN IF NOT EXISTS centum_suite_consumidor_api_publica_id TEXT;

-- Actualizar comentarios
COMMENT ON COLUMN sistema_comercial_config.centum_base_url IS 'URL base de Centum API';
COMMENT ON COLUMN sistema_comercial_config.centum_suite_consumidor_api_publica_id IS 'ID público de API de Centum Suite Consumidor';