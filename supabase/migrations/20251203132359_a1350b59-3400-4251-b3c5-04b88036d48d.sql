
-- Limpiar la columna legacy face_descriptor de empleados_datos_sensibles
-- Los datos ya están migrados a empleados_rostros

-- Primero, poner todos los face_descriptor a NULL
UPDATE empleados_datos_sensibles
SET face_descriptor = NULL
WHERE face_descriptor IS NOT NULL;

-- Agregar comentario a la columna para documentar que está deprecada
COMMENT ON COLUMN empleados_datos_sensibles.face_descriptor IS 'DEPRECADO: Usar tabla empleados_rostros para datos faciales. Esta columna se mantiene por compatibilidad pero no se usa.';
