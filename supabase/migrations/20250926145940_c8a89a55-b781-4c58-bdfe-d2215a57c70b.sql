-- Adjust kiosk threshold to be more permissive (distance-based metric)
UPDATE facial_recognition_config 
SET value = '0.8', updated_at = now()
WHERE key = 'confidence_threshold_kiosk';