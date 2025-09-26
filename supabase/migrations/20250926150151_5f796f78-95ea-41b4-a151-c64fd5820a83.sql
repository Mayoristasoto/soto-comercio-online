-- Make kiosk facial recognition much less restrictive
UPDATE facial_recognition_config 
SET value = '1.2', updated_at = now()
WHERE key = 'confidence_threshold_kiosk';

-- Also make specific employee recognition less restrictive  
UPDATE facial_recognition_config 
SET value = '1.0', updated_at = now()
WHERE key = 'confidence_threshold_specific';