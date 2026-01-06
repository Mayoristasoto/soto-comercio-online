-- Fix validate_kiosk_device to match kiosk_devices column names
CREATE OR REPLACE FUNCTION public.validate_kiosk_device(p_device_token text)
RETURNS TABLE(device_id uuid, device_name text, sucursal_id uuid, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update last_used_at if the device is valid/active
  UPDATE public.kiosk_devices
  SET last_used_at = now()
  WHERE device_token = p_device_token
    AND is_active = true;

  RETURN QUERY
  SELECT
    kd.id,
    kd.device_name,
    kd.sucursal_id,
    (kd.is_active = true) as is_valid
  FROM public.kiosk_devices kd
  WHERE kd.device_token = p_device_token;
END;
$$;