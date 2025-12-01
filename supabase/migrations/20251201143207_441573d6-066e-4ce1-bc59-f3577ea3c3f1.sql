-- Corregir el umbral correcto y eliminar duplicado
UPDATE facial_recognition_config
SET value = '0.50',
    updated_at = now()
WHERE key = 'confidence_threshold_kiosk';

-- Eliminar el umbral duplicado que creamos por error
DELETE FROM facial_recognition_config
WHERE key = 'kiosk_confidence_threshold';