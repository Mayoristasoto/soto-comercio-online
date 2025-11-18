-- Agregar campo para la clave pública de Centum API
ALTER TABLE sistema_comercial_config
ADD COLUMN IF NOT EXISTS centum_clave_publica TEXT;

COMMENT ON COLUMN sistema_comercial_config.centum_clave_publica IS 'Clave pública para generar token de autenticación Centum API';