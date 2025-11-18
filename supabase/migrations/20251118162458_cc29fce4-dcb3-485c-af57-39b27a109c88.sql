-- Agregar columna endpoint_consulta_saldo a la tabla sistema_comercial_config
ALTER TABLE sistema_comercial_config 
ADD COLUMN IF NOT EXISTS endpoint_consulta_saldo TEXT DEFAULT '/CuentaCorriente/{idCentum}/Saldo';