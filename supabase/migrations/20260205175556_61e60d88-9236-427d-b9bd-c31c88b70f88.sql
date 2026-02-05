-- Crear RPC para obtener minutos de pausa permitidos desde kiosco (sin sesión)
CREATE OR REPLACE FUNCTION public.kiosk_get_minutos_pausa(p_empleado_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutos INTEGER;
BEGIN
  SELECT ft.duracion_pausa_minutos INTO v_minutos
  FROM empleado_turnos et
  JOIN fichado_turnos ft ON ft.id = et.turno_id
  WHERE et.empleado_id = p_empleado_id
    AND et.activo = true
  LIMIT 1;
  
  RETURN COALESCE(v_minutos, 30);
END;
$$;

-- Permisos para kiosco anónimo y usuarios autenticados
GRANT EXECUTE ON FUNCTION public.kiosk_get_minutos_pausa(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_minutos_pausa(UUID) TO authenticated;