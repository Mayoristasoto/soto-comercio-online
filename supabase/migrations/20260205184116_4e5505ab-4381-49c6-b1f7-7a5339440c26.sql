-- RPC para obtener pausa activa desde sesión anónima del kiosco
CREATE OR REPLACE FUNCTION public.kiosk_get_pausa_activa(p_empleado_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pausa_inicio TIMESTAMPTZ;
  v_minutos_permitidos INTEGER;
  v_start_of_day TIMESTAMPTZ;
BEGIN
  -- Calcular inicio del día en Argentina (UTC-3)
  v_start_of_day := date_trunc('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') 
                    AT TIME ZONE 'America/Argentina/Buenos_Aires';
  
  -- Buscar último pausa_inicio de hoy que NO tenga pausa_fin posterior
  SELECT f.timestamp_real INTO v_pausa_inicio
  FROM fichajes f
  WHERE f.empleado_id = p_empleado_id
    AND f.tipo = 'pausa_inicio'
    AND f.timestamp_real >= v_start_of_day
    AND NOT EXISTS (
      SELECT 1 FROM fichajes f2 
      WHERE f2.empleado_id = p_empleado_id 
        AND f2.tipo = 'pausa_fin'
        AND f2.timestamp_real > f.timestamp_real
    )
  ORDER BY f.timestamp_real DESC
  LIMIT 1;
  
  IF v_pausa_inicio IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obtener minutos permitidos del turno
  SELECT COALESCE(ft.minutos_pausa, 30) INTO v_minutos_permitidos
  FROM empleado_turnos et
  JOIN fichado_turnos ft ON ft.id = et.turno_id
  WHERE et.empleado_id = p_empleado_id
    AND et.activo = true
    AND et.fecha_inicio <= CURRENT_DATE
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE)
  LIMIT 1;
  
  v_minutos_permitidos := COALESCE(v_minutos_permitidos, 30);
  
  RETURN json_build_object(
    'inicio', v_pausa_inicio,
    'minutos_permitidos', v_minutos_permitidos
  );
END;
$$;

-- Permisos para sesión anónima y autenticada
GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_activa(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_activa(UUID) TO authenticated;