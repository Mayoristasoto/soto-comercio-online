-- Función RPC SECURITY DEFINER para registrar cruces rojas desde el kiosco (sin sesión autenticada)
CREATE OR REPLACE FUNCTION public.kiosk_registrar_cruz_roja(
  p_empleado_id UUID,
  p_tipo_infraccion TEXT,
  p_fichaje_id UUID DEFAULT NULL,
  p_minutos_diferencia INTEGER DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO empleado_cruces_rojas (
    empleado_id,
    tipo_infraccion,
    fecha_infraccion,
    fichaje_id,
    minutos_diferencia,
    observaciones
  ) VALUES (
    p_empleado_id,
    p_tipo_infraccion,
    CURRENT_DATE,
    p_fichaje_id,
    p_minutos_diferencia,
    p_observaciones
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Permisos para anon y authenticated
GRANT EXECUTE ON FUNCTION public.kiosk_registrar_cruz_roja TO anon, authenticated;