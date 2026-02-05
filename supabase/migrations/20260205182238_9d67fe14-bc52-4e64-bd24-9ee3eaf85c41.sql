CREATE OR REPLACE FUNCTION public.kiosk_get_alert_config()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_late_arrival BOOLEAN;
  v_pause_exceeded BOOLEAN;
BEGIN
  SELECT 
    COALESCE(
      CASE LOWER(value) 
        WHEN 'true' THEN true 
        WHEN '1' THEN true 
        WHEN 'yes' THEN true 
        ELSE false 
      END, 
      false
    ) INTO v_late_arrival
  FROM facial_recognition_config 
  WHERE key = 'late_arrival_alert_enabled';
  
  SELECT 
    COALESCE(
      CASE LOWER(value) 
        WHEN 'true' THEN true 
        WHEN '1' THEN true 
        WHEN 'yes' THEN true 
        ELSE false 
      END, 
      true
    ) INTO v_pause_exceeded
  FROM facial_recognition_config 
  WHERE key = 'pause_exceeded_alert_enabled';
  
  RETURN json_build_object(
    'late_arrival_enabled', COALESCE(v_late_arrival, false),
    'pause_exceeded_enabled', COALESCE(v_pause_exceeded, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_alert_config() TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_alert_config() TO authenticated;