-- 1. Origen del cambio de horario (gerente manual vs kiosco)
ALTER TABLE public.cambios_horario ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'gerente';

-- 2. Trigger de aprobación: marca origen kiosco y avisa al empleado
CREATE OR REPLACE FUNCTION public.trg_solicitud_aprobada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE d jsonb := NEW.datos; v_emp record; v_ent time; v_min int; v_user uuid;
BEGIN
  IF NEW.estado <> 'aprobada' OR OLD.estado = 'aprobada' THEN RETURN NEW; END IF;
  SELECT nombre, apellido INTO v_emp FROM empleados WHERE id = NEW.empleado_id;
  SELECT user_id INTO v_user FROM empleados WHERE id = NEW.empleado_id;
  IF NEW.tipo_solicitud = 'elemento' THEN
    INSERT INTO entregas_elementos(empleado_id, entregado_por, tipo_elemento, descripcion, talla, cantidad, estado, observaciones)
    VALUES (NEW.empleado_id, NEW.aprobado_por, d->>'elemento', d->>'motivo', nullif(d->>'talle',''), coalesce((d->>'cantidad')::int,1), 'pendiente', 'Solicitado desde autogestión');
    IF v_user IS NOT NULL THEN
      INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo, metadata)
      VALUES (v_user, 'Pedido de elemento aprobado', 'Tu pedido de '||coalesce(d->>'elemento','elemento')||' fue aprobado. Te lo van a entregar y tenés que firmar el recibo.', 'elemento', jsonb_build_object('solicitud_id',NEW.id));
    END IF;
  ELSIF NEW.tipo_solicitud = 'cambio_horario' THEN
    INSERT INTO cambios_horario(empleado_id, solicitado_por, fecha, tipo_cambio, hora_entrada_nueva, hora_salida_nueva, justificacion, estado, origen)
    VALUES (NEW.empleado_id, NEW.empleado_id, (d->>'fecha')::date, 'manual', (d->>'entrada')::time, (d->>'salida')::time,
      coalesce(d->>'motivo','')||coalesce(': '||nullif(d->>'detalle',''),''), 'aprobado', 'kiosco');
    INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo, metadata)
    SELECT e.user_id, 'Cambio de horario aprobado',
      v_emp.nombre||' '||v_emp.apellido||' — '||NEW.descripcion||' (aprobado por gerente)', 'cambio_horario', jsonb_build_object('solicitud_id',NEW.id)
    FROM empleados e WHERE e.rol='admin_rrhh' AND e.activo AND e.user_id IS NOT NULL;
    IF v_user IS NOT NULL THEN
      INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo, metadata)
      VALUES (v_user, 'Cambio de horario aprobado', 'Tu cambio de horario del '||to_char((d->>'fecha')::date,'DD/MM/YYYY')||' ('||coalesce(d->>'entrada','')||' a '||coalesce(d->>'salida','')||') fue aprobado.', 'cambio_horario', jsonb_build_object('solicitud_id',NEW.id));
    END IF;
    IF coalesce((d->>'compensar')::boolean,false) THEN
      SELECT ft.hora_entrada INTO v_ent FROM empleado_turnos et JOIN fichado_turnos ft ON ft.id=et.turno_id WHERE et.empleado_id=NEW.empleado_id AND et.activo LIMIT 1;
      IF v_ent IS NOT NULL THEN
        v_min := (extract(epoch from ((d->>'entrada')::time - v_ent))/60)::int;
        IF v_min > 0 THEN
          INSERT INTO banco_horas_movimientos(empleado_id, fecha, minutos, origen, motivo, solicitud_id, creado_por)
          VALUES (NEW.empleado_id, (d->>'fecha')::date, -v_min, 'cambio_horario', d->>'motivo', NEW.id, NEW.aprobado_por);
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 3. Aviso al empleado cuando el gerente rechaza el cambio de horario
CREATE OR REPLACE FUNCTION public.gerente_resolver_solicitud(p_tipo text, p_id uuid, p_aprobar boolean, p_comentario text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_me record; v_emp_id uuid; v_etapa text; v_suc uuid; v_tipo_sol text; v_user uuid; v_desc text;
BEGIN
  SELECT id, rol::text rol, sucursal_id INTO v_me FROM empleados WHERE user_id = auth.uid() LIMIT 1;
  IF v_me.id IS NULL OR v_me.rol NOT IN ('gerente_sucursal','admin_rrhh') THEN RETURN jsonb_build_object('ok',false,'error','Sin permiso'); END IF;
  IF p_tipo = 'vacaciones' THEN SELECT empleado_id, etapa INTO v_emp_id, v_etapa FROM solicitudes_vacaciones WHERE id=p_id;
  ELSE SELECT empleado_id, etapa, tipo_solicitud, descripcion INTO v_emp_id, v_etapa, v_tipo_sol, v_desc FROM solicitudes_generales WHERE id=p_id; END IF;
  IF v_emp_id IS NULL OR v_etapa <> 'gerente' THEN RETURN jsonb_build_object('ok',false,'error','La solicitud no está esperando al gerente'); END IF;
  SELECT sucursal_id INTO v_suc FROM empleados WHERE id=v_emp_id;
  IF v_me.rol='gerente_sucursal' AND v_suc IS DISTINCT FROM v_me.sucursal_id THEN RETURN jsonb_build_object('ok',false,'error','No es de tu sucursal'); END IF;
  IF p_tipo = 'vacaciones' THEN
    UPDATE solicitudes_vacaciones SET etapa = CASE WHEN p_aprobar THEN 'rrhh' ELSE 'finalizada' END,
      estado = CASE WHEN p_aprobar THEN estado ELSE 'rechazada' END,
      comentarios_aprobacion = CASE WHEN p_aprobar THEN comentarios_aprobacion ELSE p_comentario END,
      aprobado_gerente_por=v_me.id, fecha_aprobacion_gerente=now(), comentario_gerente=p_comentario WHERE id=p_id;
  ELSIF v_tipo_sol = 'cambio_horario' THEN
    UPDATE solicitudes_generales SET etapa='finalizada', estado = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'rechazada' END,
      aprobado_gerente_por=v_me.id, fecha_aprobacion_gerente=now(), comentario_gerente=p_comentario,
      aprobado_por = CASE WHEN p_aprobar THEN v_me.id ELSE aprobado_por END, fecha_aprobacion = now() WHERE id=p_id;
    IF NOT p_aprobar THEN
      SELECT user_id INTO v_user FROM empleados WHERE id=v_emp_id;
      IF v_user IS NOT NULL THEN
        INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo, metadata)
        VALUES (v_user, 'Cambio de horario rechazado', 'Tu cambio de horario ('||coalesce(v_desc,'')||') fue rechazado'||coalesce(': '||p_comentario,'.'), 'cambio_horario', jsonb_build_object('solicitud_id',p_id));
      END IF;
    END IF;
  ELSE
    UPDATE solicitudes_generales SET etapa = CASE WHEN p_aprobar THEN 'rrhh' ELSE 'finalizada' END,
      estado = CASE WHEN p_aprobar THEN estado ELSE 'rechazada' END,
      aprobado_gerente_por=v_me.id, fecha_aprobacion_gerente=now(), comentario_gerente=p_comentario WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok',true);
END $function$;

-- 4. Mis métricas: mismos criterios que el informe de RRHH y la escala (solo no justificadas)
CREATE OR REPLACE FUNCTION public.kiosk_mis_metricas(p_empleado_id uuid, p_mes date DEFAULT NULL::date)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH r AS (SELECT coalesce(date_trunc('month',p_mes)::date, date_trunc('month',(now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date) d),
  rr AS (SELECT d, (d + interval '1 month')::date h FROM r)
  SELECT jsonb_build_object(
    'mes', (SELECT d FROM rr),
    'tardes', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_retraso) ORDER BY fecha_fichaje) FROM fichajes_tardios, rr WHERE empleado_id=p_empleado_id AND fecha_fichaje>=rr.d AND fecha_fichaje<rr.h AND coalesce(justificado,false)=false),'[]'),
    'descansos', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_exceso) ORDER BY fecha_fichaje) FROM fichajes_pausas_excedidas, rr WHERE empleado_id=p_empleado_id AND fecha_fichaje>=rr.d AND fecha_fichaje<rr.h AND coalesce(justificado,false)=false),'[]'),
    'dias_trabajados', (SELECT count(DISTINCT (timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) FROM fichajes, rr WHERE empleado_id=p_empleado_id AND tipo='entrada' AND (timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>=rr.d AND (timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<rr.h),
    'cruces', (SELECT count(*) FROM empleado_cruces_rojas, rr WHERE empleado_id=p_empleado_id AND fecha_infraccion>=rr.d AND fecha_infraccion<rr.h AND coalesce(anulada,false)=false),
    'banco_activo', coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='banco_horas_activo'),false),
    'banco_saldo_min', (SELECT coalesce(sum(minutos),0) FROM banco_horas_movimientos WHERE empleado_id=p_empleado_id)
  )
$function$;

-- 5. Mis pedidos: estado de la entrega de elementos
CREATE OR REPLACE FUNCTION public.kiosk_mis_pedidos(p_empleado_id uuid)
RETURNS TABLE(id uuid, tipo text, detalle text, estado text, etapa text, comentario text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, 'vacaciones', to_char(v.fecha_inicio,'DD/MM/YYYY')||' al '||to_char(v.fecha_fin,'DD/MM/YYYY'), v.estado::text, v.etapa, COALESCE(v.comentarios_aprobacion, v.comentario_gerente), v.created_at
  FROM solicitudes_vacaciones v WHERE v.empleado_id=p_empleado_id AND v.created_at > now()-interval '180 days'
  UNION ALL
  SELECT g.id, g.tipo_solicitud::text,
    COALESCE(g.descripcion,'')||CASE WHEN g.tipo_solicitud='elemento' AND g.estado='aprobada' THEN
      coalesce(' — Entrega: '||(SELECT CASE ee.estado WHEN 'pendiente' THEN 'pendiente de firma' WHEN 'entregado' THEN 'entregado' ELSE ee.estado END
        FROM entregas_elementos ee WHERE ee.empleado_id=g.empleado_id AND ee.tipo_elemento=g.datos->>'elemento' ORDER BY ee.created_at DESC LIMIT 1),'')
    ELSE '' END,
    g.estado::text, g.etapa, g.comentario_gerente, g.created_at
  FROM solicitudes_generales g WHERE g.empleado_id=p_empleado_id AND g.created_at > now()-interval '180 days'
  UNION ALL
  SELECT c.id, 'charla_rrhh', to_char(s.fecha,'DD/MM/YYYY')||' '||to_char(s.hora_inicio,'HH24:MI'), c.estado, 'finalizada', NULL, c.created_at
  FROM charlas_rrhh c JOIN entrevistas_slots s ON s.id=c.slot_id WHERE c.empleado_id=p_empleado_id AND c.created_at > now()-interval '180 days'
  ORDER BY 7 DESC
$function$;