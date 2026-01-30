-- Habilitar alerta de llegada tarde para todos los empleados
UPDATE facial_recognition_config 
SET value = 'true', updated_at = now() 
WHERE key = 'late_arrival_alert_enabled';

-- Insertar configuración si no existe (por seguridad)
INSERT INTO facial_recognition_config (key, value, data_type, description)
VALUES ('late_arrival_alert_enabled', 'true', 'boolean', 'Habilita o deshabilita la alerta de llegada tarde en el kiosco')
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now();