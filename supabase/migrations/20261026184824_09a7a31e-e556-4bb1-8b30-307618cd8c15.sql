CREATE OR REPLACE FUNCTION public.detectar_fichaje_tardio()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE turno_empleado RECORD; minutos_tarde INTEGER; hora_real_argentina TIME; tol numeric; v_fecha date; v_h2 time;
BEGIN
  IF NEW.tipo != 'entrada' THEN RETURN NEW; END IF;
  v_fecha := (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  SELECT ft.hora_entrada, ft.tolerancia_entrada_minutos INTO turno_empleado
  FROM public.empleado_turnos et JOIN public.fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = NEW.empleado_id AND et.activo AND ft.activo
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE) AND et.fecha_inicio <= CURRENT_DATE LIMIT 1;
  SELECT hora_entrada INTO v_h2 FROM public.h2_turno_publicado(NEW.empleado_id, v_fecha);
  IF v_h2 IS NULL AND turno_empleado IS NULL THEN RETURN NEW; END IF;
  tol := COALESCE((SELECT NULLIF(valor,'')::numeric FROM fichado_configuracion WHERE clave='exigencia_tolerancia_llegada_min'), turno_empleado.tolerancia_entrada_minutos, 0);
  hora_real_argentina := (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  minutos_tarde := EXTRACT(EPOCH FROM (hora_real_argentina - (COALESCE(v_h2, turno_empleado.hora_entrada) + tol * INTERVAL '1 minute'))) / 60;
  IF minutos_tarde > 0 THEN
    INSERT INTO public.fichajes_tardios (empleado_id, fecha_fichaje, hora_programada, hora_real, minutos_retraso, observaciones)
    VALUES (NEW.empleado_id, v_fecha, COALESCE(v_h2, turno_empleado.hora_entrada), hora_real_argentina, ROUND(minutos_tarde),
      CASE WHEN v_h2 IS NOT NULL THEN 'Llegada detectada automáticamente (Horario 2 publicado)' ELSE 'Llegada detectada automáticamente' END);
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.kiosk_get_turno_empleado(p_empleado_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_result JSON; v_cambio time; v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  SELECT hora_entrada_nueva INTO v_cambio FROM cambios_horario
  WHERE empleado_id=p_empleado_id AND estado='aprobado' AND fecha=v_hoy AND hora_entrada_nueva IS NOT NULL
  ORDER BY updated_at DESC LIMIT 1;
  IF v_cambio IS NULL THEN SELECT hora_entrada INTO v_cambio FROM public.h2_turno_publicado(p_empleado_id, v_hoy); END IF;
  SELECT json_build_object('hora_entrada', coalesce(v_cambio, ft.hora_entrada), 'tolerancia_entrada_minutos', COALESCE(ft.tolerancia_entrada_minutos, 5)) INTO v_result
  FROM empleado_turnos et INNER JOIN fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = p_empleado_id AND et.activo = true LIMIT 1;
  IF v_result IS NULL AND v_cambio IS NOT NULL THEN v_result := json_build_object('hora_entrada', v_cambio, 'tolerancia_entrada_minutos', 0); END IF;
  RETURN v_result;
END; $function$;