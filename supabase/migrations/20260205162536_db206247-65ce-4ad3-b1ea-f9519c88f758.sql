-- RPC para obtener el fichaje de pausa_inicio del día (para kiosco sin sesión)
CREATE OR REPLACE FUNCTION kiosk_get_pausa_inicio(
  p_empleado_id UUID,
  p_desde TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  timestamp_real TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.timestamp_real
  FROM fichajes f
  WHERE f.empleado_id = p_empleado_id
    AND f.tipo = 'pausa_inicio'
    AND f.timestamp_real >= p_desde
  ORDER BY f.timestamp_real DESC
  LIMIT 1;
END;
$$;

-- Permitir acceso anónimo
GRANT EXECUTE ON FUNCTION kiosk_get_pausa_inicio TO anon;
GRANT EXECUTE ON FUNCTION kiosk_get_pausa_inicio TO authenticated;