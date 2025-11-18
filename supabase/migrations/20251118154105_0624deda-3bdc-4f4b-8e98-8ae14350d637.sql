-- Agregar campo id_centum a empleados_datos_sensibles
ALTER TABLE empleados_datos_sensibles 
ADD COLUMN id_centum text;

COMMENT ON COLUMN empleados_datos_sensibles.id_centum IS 'ID del empleado en sistema Centum para consultar cuenta corriente';