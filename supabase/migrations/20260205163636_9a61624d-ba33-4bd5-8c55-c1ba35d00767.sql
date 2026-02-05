-- Actualizar la función kiosk_get_pausa_inicio para aceptar TEXT en lugar de TIMESTAMPTZ
-- Esto mejora la compatibilidad con strings ISO desde JavaScript

CREATE OR REPLACE FUNCTION kiosk_get_pausa_inicio(
  p_empleado_id UUID,
  p_desde TEXT  -- Cambiado de TIMESTAMPTZ a TEXT para mejor compatibilidad
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
    AND f.tipo_accion = 'pausa_inicio'
    AND f.timestamp_real >= p_desde::timestamptz  -- Cast explícito
  ORDER BY f.timestamp_real DESC
  LIMIT 1;
END;
$$;

-- Mantener los permisos
GRANT EXECUTE ON FUNCTION kiosk_get_pausa_inicio(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION kiosk_get_pausa_inicio(UUID, TEXT) TO authenticated;