-- Lower facial recognition threshold to 0.4 for easier recognition
UPDATE facial_recognition_config 
SET value = '0.4', updated_at = now()
WHERE key = 'confidence_threshold_kiosk';