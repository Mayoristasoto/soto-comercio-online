-- Función para preparar escenario de prueba de pausa excedida (solo para testing)
CREATE OR REPLACE FUNCTION public.kiosk_preparar_pausa_excedida_test(
  p_empleado_id UUID,
  p_minutos_pausa INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_of_day TIMESTAMPTZ;
  v_entrada_id UUID;
  v_pausa_id UUID;
  v_result JSONB;
BEGIN
  -- Calcular inicio del día en Argentina (UTC-3)
  v_start_of_day := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires';
  
  -- 1. Eliminar fichajes de hoy para este empleado
  DELETE FROM fichajes 
  WHERE empleado_id = p_empleado_id 
    AND timestamp_real >= v_start_of_day;
  
  -- 2. Crear entrada hace 2 horas
  INSERT INTO fichajes (empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado)
  VALUES (
    p_empleado_id,
    'entrada',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours',
    'facial',
    'valido'
  )
  RETURNING id INTO v_entrada_id;
  
  -- 3. Crear pausa_inicio hace X minutos (configurable)
  INSERT INTO fichajes (empleado_id, tipo, timestamp_real, timestamp_aplicado, metodo, estado)
  VALUES (
    p_empleado_id,
    'pausa_inicio',
    NOW() - (p_minutos_pausa || ' minutes')::INTERVAL,
    NOW() - (p_minutos_pausa || ' minutes')::INTERVAL,
    'facial',
    'valido'
  )
  RETURNING id INTO v_pausa_id;
  
  -- 4. Retornar información del escenario creado
  v_result := jsonb_build_object(
    'success', true,
    'entrada_id', v_entrada_id,
    'pausa_inicio_id', v_pausa_id,
    'minutos_pausa', p_minutos_pausa,
    'start_of_day', v_start_of_day,
    'mensaje', 'Escenario preparado: entrada hace 2h, pausa_inicio hace ' || p_minutos_pausa || ' minutos'
  );
  
  RETURN v_result;
END;
$$;

-- Permitir ejecución a usuarios autenticados (admins)
GRANT EXECUTE ON FUNCTION public.kiosk_preparar_pausa_excedida_test TO authenticated;

-- Función para limpiar fichajes de prueba
CREATE OR REPLACE FUNCTION public.kiosk_limpiar_fichajes_hoy(p_empleado_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_of_day TIMESTAMPTZ;
  v_deleted_count INTEGER;
BEGIN
  v_start_of_day := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires';
  
  DELETE FROM fichajes 
  WHERE empleado_id = p_empleado_id 
    AND timestamp_real >= v_start_of_day;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'mensaje', 'Se eliminaron ' || v_deleted_count || ' fichajes de hoy'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_limpiar_fichajes_hoy TO authenticated;