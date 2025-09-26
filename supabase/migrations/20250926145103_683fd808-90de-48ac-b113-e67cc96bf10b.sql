-- Lower facial recognition thresholds for better recognition
UPDATE facial_recognition_config 
SET value = '0.55', updated_at = now()
WHERE key = 'confidence_threshold_kiosk';

UPDATE facial_recognition_config 
SET value = '0.50', updated_at = now()
WHERE key = 'confidence_threshold_specific';

UPDATE facial_recognition_config 
SET value = '0.30', updated_at = now()
WHERE key = 'confidence_threshold_demo';