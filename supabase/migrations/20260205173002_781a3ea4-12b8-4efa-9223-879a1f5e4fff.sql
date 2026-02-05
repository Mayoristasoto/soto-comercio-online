-- Eliminar la versión con timestamptz que causa ambigüedad PGRST203
DROP FUNCTION IF EXISTS public.kiosk_get_pausa_inicio(uuid, timestamptz);

-- Recrear la función única con TEXT y columna correcta (f.tipo, no tipo_accion)
CREATE OR REPLACE FUNCTION public.kiosk_get_pausa_inicio(
  p_empleado_id UUID,
  p_desde TEXT
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
    AND f.timestamp_real >= (p_desde::timestamptz)
  ORDER BY f.timestamp_real DESC
  LIMIT 1;
END;
$$;

-- Permisos para kiosco sin sesión
GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_inicio(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_inicio(uuid, text) TO authenticated;