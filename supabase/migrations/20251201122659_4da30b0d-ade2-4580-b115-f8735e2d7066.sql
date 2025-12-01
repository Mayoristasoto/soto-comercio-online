
-- Actualizar umbral de confianza del kiosko de 0.55 a 0.50 (50%)
UPDATE facial_recognition_config
SET value = '0.50',
    updated_at = now()
WHERE key = 'kiosk_confidence_threshold';

-- Si no existe, crearlo
INSERT INTO facial_recognition_config (key, value, description, data_type)
VALUES (
  'kiosk_confidence_threshold',
  '0.50',
  'Umbral de confianza mínimo para autenticación en kiosko (0.0 - 1.0)',
  'decimal'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
