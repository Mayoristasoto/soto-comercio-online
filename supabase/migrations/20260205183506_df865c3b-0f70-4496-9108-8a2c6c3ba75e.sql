-- RPC para obtener turno de empleado desde kiosco (sesión anónima)
CREATE OR REPLACE FUNCTION public.kiosk_get_turno_empleado(p_empleado_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'hora_entrada', ft.hora_entrada,
    'tolerancia_entrada_minutos', COALESCE(ft.tolerancia_entrada_minutos, 5)
  ) INTO v_result
  FROM empleado_turnos et
  INNER JOIN fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = p_empleado_id
    AND et.activo = true
  LIMIT 1;
  
  RETURN v_result;
END;
$$;

-- Permisos para kiosco (anon) y usuarios autenticados
GRANT EXECUTE ON FUNCTION public.kiosk_get_turno_empleado(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_turno_empleado(UUID) TO authenticated;