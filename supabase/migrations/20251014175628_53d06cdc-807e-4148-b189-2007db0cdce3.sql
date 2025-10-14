
-- Activar el reconocimiento de emociones en el sistema de fichaje facial
INSERT INTO facial_recognition_config (key, value, description)
VALUES ('emotion_recognition_enabled', 'true', 'Habilita el reconocimiento de emociones durante el fichaje facial')
ON CONFLICT (key) 
DO UPDATE SET value = 'true', updated_at = now();
