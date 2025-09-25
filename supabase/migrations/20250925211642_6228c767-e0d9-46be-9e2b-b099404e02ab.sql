-- Update the function to handle any tipo of fichaje with correct enum name
CREATE OR REPLACE FUNCTION public.kiosk_insert_fichaje(
  p_empleado_id uuid,
  p_confianza numeric,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_datos jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  fichaje_tipo fichaje_tipo;
BEGIN
  -- Extract tipo from datos, default to 'entrada' for kiosk
  fichaje_tipo := COALESCE((p_datos->>'tipo')::fichaje_tipo, 'entrada');
  
  INSERT INTO public.fichajes (
    empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado,
    latitud, longitud, confianza_facial, ip_address, datos_adicionales
  ) VALUES (
    p_empleado_id, fichaje_tipo, now(), now(), 'facial', 'valido',
    p_lat, p_lng, p_confianza, NULL, p_datos
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;