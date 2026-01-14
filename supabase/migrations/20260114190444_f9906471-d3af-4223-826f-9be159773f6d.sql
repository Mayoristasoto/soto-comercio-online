-- Función RPC para verificar si es el primer check-in del día
CREATE OR REPLACE FUNCTION kiosk_es_primer_checkin_del_dia(p_empleado_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cantidad_entradas INTEGER;
BEGIN
  SELECT COUNT(*) INTO cantidad_entradas
  FROM fichajes
  WHERE empleado_id = p_empleado_id
    AND tipo = 'entrada'
    AND estado = 'valido'
    AND timestamp_real >= CURRENT_DATE
    AND timestamp_real < CURRENT_DATE + INTERVAL '1 day';
  
  -- Es primer check-in si hay exactamente 1 entrada (la que se acaba de registrar)
  RETURN cantidad_entradas = 1;
END;
$$;

-- Permisos para que el kiosco pueda llamar la función
GRANT EXECUTE ON FUNCTION kiosk_es_primer_checkin_del_dia TO anon, authenticated;