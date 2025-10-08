-- Agregar configuración de reconocimiento de emociones
INSERT INTO facial_recognition_config (key, value, description)
VALUES (
  'emotion_recognition_enabled',
  'false',
  'Habilitar detección de emociones en el kiosco de check-in'
)
ON CONFLICT (key) DO NOTHING;