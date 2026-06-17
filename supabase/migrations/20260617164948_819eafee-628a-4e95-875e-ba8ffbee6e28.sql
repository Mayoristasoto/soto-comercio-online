
CREATE OR REPLACE FUNCTION public.kiosk_validar_descanso_turno(
  p_empleado_id UUID,
  p_fichaje_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fichaje RECORD;
  v_sucursal_id UUID;
  v_semana_inicio DATE;
  v_hora_local TIME;
  v_fecha_local DATE;
  v_asig RECORD;
  v_tiene_turnos BOOLEAN;
  v_resultado TEXT;
  v_descripcion TEXT;
BEGIN
  SELECT id, empleado_id, tipo, timestamp_real INTO v_fichaje
  FROM public.fichajes WHERE id = p_fichaje_id;

  IF NOT FOUND OR v_fichaje.tipo <> 'pausa_inicio' THEN
    RETURN jsonb_build_object('ok', true, 'motivo', 'no_aplica');
  END IF;

  -- Sucursal del empleado
  SELECT sucursal_id INTO v_sucursal_id
  FROM public.empleados WHERE id = p_empleado_id;

  -- ¿La sucursal tiene turnos configurados?
  SELECT EXISTS(
    SELECT 1 FROM public.planilla_descansos_turnos
    WHERE sucursal_id = v_sucursal_id AND activo = true
  ) INTO v_tiene_turnos;

  IF NOT v_tiene_turnos THEN
    RETURN jsonb_build_object('ok', true, 'motivo', 'sucursal_sin_planilla');
  END IF;

  -- Hora local Argentina (UTC-3)
  v_fecha_local := (v_fichaje.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_hora_local := (v_fichaje.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time;
  v_semana_inicio := v_fecha_local - ((EXTRACT(ISODOW FROM v_fecha_local)::int - 1));

  -- Buscar asignación vigente
  SELECT a.*, t.numero_turno, t.hora_desde, t.hora_hasta
  INTO v_asig
  FROM public.planilla_descansos_asignaciones a
  JOIN public.planilla_descansos_turnos t ON t.id = a.turno_id
  WHERE a.empleado_id = p_empleado_id
    AND a.sucursal_id = v_sucursal_id
    AND a.activo = true
    AND v_fecha_local BETWEEN a.semana_inicio AND a.semana_fin
  LIMIT 1;

  IF NOT FOUND THEN
    v_descripcion := 'Empleado fichó pausa sin turno de descanso asignado para la semana del ' || v_semana_inicio;
    INSERT INTO public.fichaje_incidencias (empleado_id, fichaje_id, tipo, descripcion, fecha_incidencia, hora_propuesta, estado)
    VALUES (p_empleado_id, p_fichaje_id, 'descanso_sin_turno', v_descripcion, v_fecha_local, v_hora_local, 'pendiente');
    RETURN jsonb_build_object('ok', false, 'motivo', 'sin_turno', 'descripcion', v_descripcion);
  END IF;

  IF v_hora_local >= v_asig.hora_desde AND v_hora_local <= v_asig.hora_hasta THEN
    RETURN jsonb_build_object('ok', true, 'motivo', 'en_turno', 'turno', v_asig.numero_turno,
      'desde', v_asig.hora_desde, 'hasta', v_asig.hora_hasta);
  END IF;

  v_descripcion := 'Pausa iniciada a las ' || to_char(v_hora_local,'HH24:MI')
    || ' fuera del Turno ' || v_asig.numero_turno
    || ' asignado (' || to_char(v_asig.hora_desde,'HH24:MI') || ' a ' || to_char(v_asig.hora_hasta,'HH24:MI') || ')';
  INSERT INTO public.fichaje_incidencias (empleado_id, fichaje_id, tipo, descripcion, fecha_incidencia, hora_propuesta, estado)
  VALUES (p_empleado_id, p_fichaje_id, 'descanso_fuera_turno', v_descripcion, v_fecha_local, v_hora_local, 'pendiente');

  RETURN jsonb_build_object('ok', false, 'motivo', 'fuera_turno', 'turno', v_asig.numero_turno,
    'desde', v_asig.hora_desde, 'hasta', v_asig.hora_hasta, 'descripcion', v_descripcion);
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_validar_descanso_turno(UUID, UUID) TO anon, authenticated;

-- Función auxiliar para obtener turno asignado de la semana (lectura desde kiosco)
CREATE OR REPLACE FUNCTION public.kiosk_get_turno_descanso(
  p_empleado_id UUID
)
RETURNS TABLE (
  numero_turno INT,
  hora_desde TIME,
  hora_hasta TIME,
  semana_inicio DATE,
  semana_fin DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sucursal_id UUID;
  v_fecha_local DATE;
BEGIN
  SELECT sucursal_id INTO v_sucursal_id FROM public.empleados WHERE id = p_empleado_id;
  v_fecha_local := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  RETURN QUERY
  SELECT t.numero_turno, t.hora_desde, t.hora_hasta, a.semana_inicio, a.semana_fin
  FROM public.planilla_descansos_asignaciones a
  JOIN public.planilla_descansos_turnos t ON t.id = a.turno_id
  WHERE a.empleado_id = p_empleado_id
    AND a.sucursal_id = v_sucursal_id
    AND a.activo = true
    AND v_fecha_local BETWEEN a.semana_inicio AND a.semana_fin
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_turno_descanso(UUID) TO anon, authenticated;
