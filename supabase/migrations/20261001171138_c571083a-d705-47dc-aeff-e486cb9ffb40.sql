INSERT INTO public.fichado_configuracion (clave, valor, descripcion, tipo) VALUES
 ('exigencia_tolerancia_llegada_min','0','Tolerancia global de llegada (min). Vacío = usa la del turno','number'),
 ('exigencia_tolerancia_pausa_min','0','Minutos extra permitidos sobre el descanso','number'),
 ('exigencia_escalas','{"aviso":2,"llamado":3,"apercibimiento":5}','Escalas mensuales de llegadas tarde / excesos','json'),
 ('exigencia_desde','2026-10-01','Fecha desde la que corren las escalas','text')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.cfg_num(_clave text, _def numeric) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT NULLIF(valor,'')::numeric FROM fichado_configuracion WHERE clave=_clave LIMIT 1), _def) $$;

CREATE OR REPLACE FUNCTION public.detectar_fichaje_tardio() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE turno_empleado RECORD; minutos_tarde INTEGER; hora_real_argentina TIME; tol numeric;
BEGIN
  IF NEW.tipo != 'entrada' THEN RETURN NEW; END IF;
  SELECT ft.hora_entrada, ft.tolerancia_entrada_minutos INTO turno_empleado
  FROM public.empleado_turnos et JOIN public.fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = NEW.empleado_id AND et.activo AND ft.activo
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE) AND et.fecha_inicio <= CURRENT_DATE LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  tol := COALESCE((SELECT NULLIF(valor,'')::numeric FROM fichado_configuracion WHERE clave='exigencia_tolerancia_llegada_min'), turno_empleado.tolerancia_entrada_minutos, 0);
  hora_real_argentina := (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  minutos_tarde := EXTRACT(EPOCH FROM (hora_real_argentina - (turno_empleado.hora_entrada + tol * INTERVAL '1 minute'))) / 60;
  IF minutos_tarde > 0 THEN
    INSERT INTO public.fichajes_tardios (empleado_id, fecha_fichaje, hora_programada, hora_real, minutos_retraso, observaciones)
    VALUES (NEW.empleado_id, (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE, turno_empleado.hora_entrada, hora_real_argentina, ROUND(minutos_tarde), 'Llegada detectada automáticamente');
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.detectar_exceso_pausa() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE pausa_inicio_record RECORD; turno_record RECORD; duracion_real_minutos INTEGER; exceso_minutos INTEGER; hora_inicio_arg TIME; hora_fin_arg TIME;
BEGIN
  IF NEW.tipo != 'pausa_fin' THEN RETURN NEW; END IF;
  SELECT f.id, f.timestamp_real as hora_inicio, f.empleado_id INTO pausa_inicio_record FROM fichajes f
  WHERE f.empleado_id = NEW.empleado_id
    AND DATE(f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires') = DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')
    AND f.tipo = 'pausa_inicio' AND f.estado = 'valido' AND f.timestamp_real < NEW.timestamp_real
  ORDER BY f.timestamp_real DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT ft.duracion_pausa_minutos, ft.id as turno_id INTO turno_record
  FROM empleado_turnos et JOIN fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = NEW.empleado_id AND et.activo AND ft.activo
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'))
  LIMIT 1;
  IF NOT FOUND OR turno_record.duracion_pausa_minutos IS NULL THEN RETURN NEW; END IF;
  hora_inicio_arg := (pausa_inicio_record.hora_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  hora_fin_arg := (NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::TIME;
  duracion_real_minutos := ROUND(EXTRACT(EPOCH FROM (NEW.timestamp_real - pausa_inicio_record.hora_inicio)) / 60);
  exceso_minutos := duracion_real_minutos - turno_record.duracion_pausa_minutos - public.cfg_num('exigencia_tolerancia_pausa_min', 0)::int;
  IF exceso_minutos >= 1 THEN
    INSERT INTO fichajes_pausas_excedidas (empleado_id, fecha_fichaje, hora_inicio_pausa, hora_fin_pausa, duracion_minutos, duracion_permitida_minutos, minutos_exceso, turno_id)
    VALUES (NEW.empleado_id, DATE(NEW.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires'), hora_inicio_arg, hora_fin_arg, duracion_real_minutos, turno_record.duracion_pausa_minutos, exceso_minutos, turno_record.turno_id);
  END IF;
  RETURN NEW;
END; $function$;

-- Escalas automáticas
CREATE OR REPLACE FUNCTION public.aplicar_escala_exigencia() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  tipo text := CASE WHEN TG_TABLE_NAME='fichajes_tardios' THEN 'tarde' ELSE 'descanso' END;
  etiqueta text := CASE WHEN TG_TABLE_NAME='fichajes_tardios' THEN 'llegadas tarde' ELSE 'excesos de descanso' END;
  esc jsonb; desde date; n int; emp RECORD; autor uuid; mes text; clave text; cat anotacion_categoria; titulo text;
BEGIN
  desde := COALESCE((SELECT NULLIF(valor,'')::date FROM fichado_configuracion WHERE clave='exigencia_desde'), '2026-10-01');
  IF NEW.fecha_fichaje < desde THEN RETURN NEW; END IF;
  esc := COALESCE((SELECT valor::jsonb FROM fichado_configuracion WHERE clave='exigencia_escalas'), '{"aviso":2,"llamado":3,"apercibimiento":5}');
  mes := to_char(NEW.fecha_fichaje,'YYYY-MM');
  EXECUTE format('SELECT count(*) FROM %I WHERE empleado_id=$1 AND COALESCE(justificado,false)=false AND to_char(fecha_fichaje,''YYYY-MM'')=$2', TG_TABLE_NAME)
    INTO n USING NEW.empleado_id, mes;
  SELECT id, nombre, apellido, sucursal_id INTO emp FROM empleados WHERE id=NEW.empleado_id;
  IF n = (esc->>'aviso')::int OR n = (esc->>'llamado')::int OR n = (esc->>'apercibimiento')::int THEN
    INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, metadata)
    SELECT e.user_id, 'Exigencia: '||emp.apellido||' '||emp.nombre,
      emp.apellido||' '||emp.nombre||' lleva '||n||' '||etiqueta||' en '||mes, 'alerta',
      jsonb_build_object('empleado_id',emp.id,'tipo',tipo,'cantidad',n,'periodo',mes)
    FROM empleados e WHERE e.activo AND e.user_id IS NOT NULL
      AND (e.rol='admin_rrhh' OR (e.rol='gerente_sucursal' AND e.sucursal_id=emp.sucursal_id));
  END IF;
  IF n = (esc->>'llamado')::int OR n = (esc->>'apercibimiento')::int THEN
    cat := CASE WHEN n = (esc->>'apercibimiento')::int THEN 'apercibimiento' ELSE 'llamado_atencion' END;
    titulo := CASE WHEN cat='apercibimiento' THEN 'Apercibimiento automático' ELSE 'Llamado de atención automático' END || ' - '||n||' '||etiqueta||' ('||mes||')';
    SELECT id INTO autor FROM empleados WHERE rol='admin_rrhh' AND activo ORDER BY created_at LIMIT 1;
    IF autor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empleados_anotaciones WHERE empleado_id=emp.id AND titulo = titulo) THEN
      INSERT INTO empleados_anotaciones (empleado_id, creado_por, categoria, titulo, descripcion, requiere_seguimiento, es_critica)
      VALUES (emp.id, autor, cat, titulo, 'Generado por las reglas de exigencia del mes.', cat='apercibimiento', cat='apercibimiento');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_escala_tardios ON public.fichajes_tardios;
CREATE TRIGGER trg_escala_tardios AFTER INSERT ON public.fichajes_tardios FOR EACH ROW EXECUTE FUNCTION public.aplicar_escala_exigencia();
DROP TRIGGER IF EXISTS trg_escala_pausas ON public.fichajes_pausas_excedidas;
CREATE TRIGGER trg_escala_pausas AFTER INSERT ON public.fichajes_pausas_excedidas FOR EACH ROW EXECUTE FUNCTION public.aplicar_escala_exigencia();

-- Contador para el kiosco
CREATE OR REPLACE FUNCTION public.kiosk_contador_exigencia(p_empleado_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'tardes', (SELECT count(*) FROM fichajes_tardios WHERE empleado_id=p_empleado_id AND NOT COALESCE(justificado,false) AND date_trunc('month',fecha_fichaje)=date_trunc('month',(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)),
    'descansos', (SELECT count(*) FROM fichajes_pausas_excedidas WHERE empleado_id=p_empleado_id AND NOT COALESCE(justificado,false) AND date_trunc('month',fecha_fichaje)=date_trunc('month',(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)))
$$;
GRANT EXECUTE ON FUNCTION public.kiosk_contador_exigencia(uuid) TO anon, authenticated;

-- Informe
CREATE OR REPLACE FUNCTION public.informe_puntualidad(p_desde date, p_hasta date)
RETURNS TABLE(empleado_id uuid, nombre text, apellido text, sucursal_id uuid, tipo text, fecha date, programada time, real_inicio time, real_fin time, minutos int, justificado boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_rrhh'::user_role) AND NOT EXISTS (SELECT 1 FROM empleados WHERE user_id=auth.uid() AND rol='admin_rrhh') THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;
  RETURN QUERY
  SELECT e.id, e.nombre::text, e.apellido::text, e.sucursal_id, 'tarde'::text, t.fecha_fichaje, t.hora_programada, t.hora_real, NULL::time, t.minutos_retraso, COALESCE(t.justificado,false)
  FROM fichajes_tardios t JOIN empleados e ON e.id=t.empleado_id WHERE t.fecha_fichaje BETWEEN p_desde AND p_hasta
  UNION ALL
  SELECT e.id, e.nombre::text, e.apellido::text, e.sucursal_id, 'descanso', p.fecha_fichaje, NULL, p.hora_inicio_pausa, p.hora_fin_pausa, p.minutos_exceso, COALESCE(p.justificado,false)
  FROM fichajes_pausas_excedidas p JOIN empleados e ON e.id=p.empleado_id WHERE p.fecha_fichaje BETWEEN p_desde AND p_hasta;
END $$;
GRANT EXECUTE ON FUNCTION public.informe_puntualidad(date,date) TO authenticated;