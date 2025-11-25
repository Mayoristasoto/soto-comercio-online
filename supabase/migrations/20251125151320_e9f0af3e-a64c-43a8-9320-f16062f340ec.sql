-- Actualizar umbrales de confianza para hacer el reconocimiento facial más estricto
-- Esto ayudará a prevenir falsos positivos (empleados reconocidos como otros)

UPDATE facial_recognition_config 
SET value = '0.75', updated_at = now()
WHERE key = 'confidence_threshold_kiosk';

UPDATE facial_recognition_config 
SET value = '0.72', updated_at = now()
WHERE key = 'confidence_threshold_specific';

-- Agregar comentario explicativo
COMMENT ON TABLE facial_recognition_config IS 'Configuración del sistema de reconocimiento facial. Umbrales más altos (0.70-0.80) son más estrictos y reducen falsos positivos. La función authenticate_face_kiosk usa estos valores para comparar rostros desde la tabla empleados_rostros (múltiples versiones por empleado).';