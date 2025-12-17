-- Función para validar dispositivo (usada desde el kiosco)
CREATE OR REPLACE FUNCTION public.validate_kiosk_device(p_device_token TEXT)
RETURNS TABLE(device_id UUID, device_name TEXT, sucursal_id UUID, is_valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar last_used_at si el dispositivo es válido
  UPDATE kiosk_devices
  SET last_used_at = now()
  WHERE device_token = p_device_token AND activo = true;
  
  RETURN QUERY
  SELECT 
    kd.id,
    kd.nombre,
    kd.sucursal_id,
    (kd.activo = true) as is_valid
  FROM kiosk_devices kd
  WHERE kd.device_token = p_device_token;
END;
$$;

-- Permitir ejecución anónima para validación desde kiosco
GRANT EXECUTE ON FUNCTION public.validate_kiosk_device(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_kiosk_device(TEXT) TO authenticated;