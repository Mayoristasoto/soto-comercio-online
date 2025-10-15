-- Crear función RPC para obtener acciones disponibles del kiosco evitando RLS
CREATE OR REPLACE FUNCTION public.kiosk_get_acciones(
  p_empleado_id uuid
)
RETURNS TABLE(accion text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ultimo_tipo fichaje_tipo;
BEGIN
  SELECT tipo INTO ultimo_tipo
  FROM public.fichajes
  WHERE empleado_id = p_empleado_id
    AND DATE(timestamp_real) = CURRENT_DATE
    AND estado = 'valido'
  ORDER BY timestamp_real DESC
  LIMIT 1;

  IF ultimo_tipo IS NULL THEN
    RETURN QUERY SELECT 'entrada'::text;
  ELSIF ultimo_tipo = 'entrada' THEN
    RETURN QUERY SELECT 'pausa_inicio'::text UNION ALL SELECT 'salida'::text;
  ELSIF ultimo_tipo = 'pausa_inicio' THEN
    RETURN QUERY SELECT 'pausa_fin'::text;
  ELSIF ultimo_tipo = 'pausa_fin' THEN
    RETURN QUERY SELECT 'salida'::text;
  ELSE
    -- Si ya registró salida u otro estado final, no devolver acciones
    RETURN;
  END IF;
END;
$$;