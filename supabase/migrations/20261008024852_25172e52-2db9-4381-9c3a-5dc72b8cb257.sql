ALTER TABLE public.solicitudes_generales ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.solicitudes_generales DROP CONSTRAINT solicitudes_generales_tipo_solicitud_check;
ALTER TABLE public.solicitudes_generales ADD CONSTRAINT solicitudes_generales_tipo_solicitud_check CHECK (tipo_solicitud = ANY (ARRAY['dia_medico','adelanto_sueldo','permiso','matrimonio','fallecimiento_familiar','nacimiento_hijo','examen_estudiantil','maternidad','paternidad','donacion_sangre','actividad_gremial','licencia_medica','dia_estudio','justificacion_inasistencia','elemento','cambio_horario']));

-- Banco de horas
CREATE TABLE public.banco_horas_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  minutos integer NOT NULL,
  origen text NOT NULL DEFAULT 'manual',
  motivo text,
  solicitud_id uuid,
  creado_por uuid REFERENCES public.empleados(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_horas_movimientos TO authenticated;
GRANT ALL ON public.banco_horas_movimientos TO service_role;
ALTER TABLE public.banco_horas_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bh_admin" ON public.banco_horas_movimientos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "bh_propio" ON public.banco_horas_movimientos FOR SELECT TO authenticated USING (empleado_id = public.current_empleado_id());

INSERT INTO public.fichado_configuracion (clave, valor, descripcion)
SELECT k, v, d FROM (VALUES
 ('banco_horas_activo','false','Banco de horas activo'),
 ('banco_horas_tope_negativo_min','-480','Tope negativo del banco de horas (minutos)'),
 ('banco_horas_tope_positivo_min','960','Tope positivo del banco de horas (minutos)')) x(k,v,d)
WHERE NOT EXISTS (SELECT 1 FROM public.fichado_configuracion WHERE clave = x.k);

-- Nuevas tarjetas de autogestión
INSERT INTO public.autogestion_secciones (clave, orden, titulo, descripcion, opciones) VALUES
 ('elementos',7,'Solicitar elementos','Pedí uniforme, calzado u otros elementos','{}'),
 ('metricas',8,'Mis métricas del mes','Tus llegadas tarde y excesos de descanso','{}'),
 ('cambio_horario',9,'Solicitar cambio de horario','Turno médico, trámite u otro motivo','{}')
ON CONFLICT (clave) DO NOTHING;

-- Kiosco: solicitar elemento
CREATE OR REPLACE FUNCTION public.kiosk_solicitar_elemento(p_empleado_id uuid, p_elemento text, p_talle text, p_cantidad int, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM empleados WHERE id=p_empleado_id AND activo) THEN RETURN jsonb_build_object('ok',false,'error','Empleado inválido'); END IF;
  IF coalesce(trim(p_elemento),'')='' OR p_cantidad IS NULL OR p_cantidad < 1 OR p_cantidad > 20 THEN RETURN jsonb_build_object('ok',false,'error','Datos inválidos'); END IF;
  INSERT INTO solicitudes_generales(empleado_id, tipo_solicitud, fecha_solicitud, descripcion, estado, etapa, datos)
  VALUES (p_empleado_id,'elemento',(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
    left(p_elemento,100) || coalesce(' talle '||nullif(trim(p_talle),''),'') || ' x' || p_cantidad || coalesce(' — '||nullif(trim(p_motivo),''),''),
    'pendiente','rrhh', jsonb_build_object('elemento',left(p_elemento,100),'talle',left(coalesce(p_talle,''),20),'cantidad',p_cantidad,'motivo',left(coalesce(p_motivo,''),300)))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
END $$;

CREATE OR REPLACE FUNCTION public.kiosk_items_elementos()
RETURNS TABLE(nombre text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT nombre FROM entregas_items WHERE activo ORDER BY 1
$$;

-- Kiosco: solicitar cambio de horario
CREATE OR REPLACE FUNCTION public.kiosk_solicitar_cambio_horario(p_empleado_id uuid, p_fecha date, p_entrada time, p_salida time, p_motivo text, p_detalle text, p_compensar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM empleados WHERE id=p_empleado_id AND activo) THEN RETURN jsonb_build_object('ok',false,'error','Empleado inválido'); END IF;
  IF p_fecha IS NULL OR p_fecha < v_hoy OR p_fecha > v_hoy + 90 THEN RETURN jsonb_build_object('ok',false,'error','Fecha inválida'); END IF;
  IF p_entrada IS NULL OR p_salida IS NULL OR p_salida <= p_entrada THEN RETURN jsonb_build_object('ok',false,'error','Horario inválido'); END IF;
  INSERT INTO solicitudes_generales(empleado_id, tipo_solicitud, fecha_solicitud, descripcion, estado, etapa, datos)
  VALUES (p_empleado_id,'cambio_horario',v_hoy,
    to_char(p_fecha,'DD/MM/YYYY')||' '||to_char(p_entrada,'HH24:MI')||'–'||to_char(p_salida,'HH24:MI')||' ('||left(coalesce(p_motivo,'otro'),40)||')',
    'pendiente','gerente', jsonb_build_object('fecha',p_fecha,'entrada',to_char(p_entrada,'HH24:MI'),'salida',to_char(p_salida,'HH24:MI'),'motivo',left(coalesce(p_motivo,''),40),'detalle',left(coalesce(p_detalle,''),300),'compensar',coalesce(p_compensar,false)))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
END $$;

-- Kiosco: métricas del mes (siempre visibles para el propio empleado)
CREATE OR REPLACE FUNCTION public.kiosk_mis_metricas(p_empleado_id uuid, p_mes date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (SELECT coalesce(date_trunc('month',p_mes)::date, date_trunc('month',(now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date) d),
  rr AS (SELECT d, (d + interval '1 month')::date h FROM r)
  SELECT jsonb_build_object(
    'mes', (SELECT d FROM rr),
    'tardes', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_retraso) ORDER BY fecha_fichaje) FROM fichajes_tardios, rr WHERE empleado_id=p_empleado_id AND fecha_fichaje>=rr.d AND fecha_fichaje<rr.h),'[]'),
    'descansos', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_exceso) ORDER BY fecha_fichaje) FROM fichajes_pausas_excedidas, rr WHERE empleado_id=p_empleado_id AND fecha_fichaje>=rr.d AND fecha_fichaje<rr.h),'[]'),
    'dias_trabajados', (SELECT count(DISTINCT (timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) FROM fichajes, rr WHERE empleado_id=p_empleado_id AND tipo='entrada' AND (timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>=rr.d AND (timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<rr.h),
    'cruces', (SELECT count(*) FROM empleado_cruces_rojas, rr WHERE empleado_id=p_empleado_id AND fecha_infraccion>=rr.d AND fecha_infraccion<rr.h AND coalesce(anulada,false)=false),
    'banco_activo', coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='banco_horas_activo'),false),
    'banco_saldo_min', (SELECT coalesce(sum(minutos),0) FROM banco_horas_movimientos WHERE empleado_id=p_empleado_id)
  )
$$;

-- Gerente aprueba cambio de horario: queda aprobado final y avisa a RRHH
CREATE OR REPLACE FUNCTION public.gerente_resolver_solicitud(p_tipo text, p_id uuid, p_aprobar boolean, p_comentario text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me record; v_emp_id uuid; v_etapa text; v_suc uuid; v_tipo_sol text;
BEGIN
  SELECT id, rol::text rol, sucursal_id INTO v_me FROM empleados WHERE user_id = auth.uid() LIMIT 1;
  IF v_me.id IS NULL OR v_me.rol NOT IN ('gerente_sucursal','admin_rrhh') THEN RETURN jsonb_build_object('ok',false,'error','Sin permiso'); END IF;
  IF p_tipo = 'vacaciones' THEN SELECT empleado_id, etapa INTO v_emp_id, v_etapa FROM solicitudes_vacaciones WHERE id=p_id;
  ELSE SELECT empleado_id, etapa, tipo_solicitud INTO v_emp_id, v_etapa, v_tipo_sol FROM solicitudes_generales WHERE id=p_id; END IF;
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
  ELSE
    UPDATE solicitudes_generales SET etapa = CASE WHEN p_aprobar THEN 'rrhh' ELSE 'finalizada' END,
      estado = CASE WHEN p_aprobar THEN estado ELSE 'rechazada' END,
      aprobado_gerente_por=v_me.id, fecha_aprobacion_gerente=now(), comentario_gerente=p_comentario WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

-- Al aprobar: elemento -> entrega pendiente; cambio horario -> cambios_horario + aviso RRHH + banco
CREATE OR REPLACE FUNCTION public.trg_solicitud_aprobada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d jsonb := NEW.datos; v_emp record; v_ent time; v_min int;
BEGIN
  IF NEW.estado <> 'aprobada' OR OLD.estado = 'aprobada' THEN RETURN NEW; END IF;
  SELECT nombre, apellido INTO v_emp FROM empleados WHERE id = NEW.empleado_id;
  IF NEW.tipo_solicitud = 'elemento' THEN
    INSERT INTO entregas_elementos(empleado_id, entregado_por, tipo_elemento, descripcion, talla, cantidad, estado, observaciones)
    VALUES (NEW.empleado_id, NEW.aprobado_por, d->>'elemento', d->>'motivo', nullif(d->>'talle',''), coalesce((d->>'cantidad')::int,1), 'pendiente', 'Solicitado desde autogestión');
  ELSIF NEW.tipo_solicitud = 'cambio_horario' THEN
    INSERT INTO cambios_horario(empleado_id, solicitado_por, fecha, tipo_cambio, hora_entrada_nueva, hora_salida_nueva, justificacion, estado)
    VALUES (NEW.empleado_id, NEW.empleado_id, (d->>'fecha')::date, 'manual', (d->>'entrada')::time, (d->>'salida')::time,
      coalesce(d->>'motivo','')||coalesce(': '||nullif(d->>'detalle',''),''), 'aprobado');
    INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo, metadata)
    SELECT e.user_id, 'Cambio de horario aprobado',
      v_emp.nombre||' '||v_emp.apellido||' — '||NEW.descripcion||' (aprobado por gerente)', 'cambio_horario', jsonb_build_object('solicitud_id',NEW.id)
    FROM empleados e WHERE e.rol='admin_rrhh' AND e.activo AND e.user_id IS NOT NULL;
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
END $$;
CREATE TRIGGER solicitud_aprobada_acciones AFTER UPDATE OF estado ON public.solicitudes_generales FOR EACH ROW EXECUTE FUNCTION public.trg_solicitud_aprobada();

-- El kiosco respeta cambios de horario aprobados del día
CREATE OR REPLACE FUNCTION public.kiosk_get_turno_empleado(p_empleado_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_result JSON; v_cambio time;
BEGIN
  SELECT hora_entrada_nueva INTO v_cambio FROM cambios_horario
  WHERE empleado_id=p_empleado_id AND estado='aprobado' AND fecha=(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AND hora_entrada_nueva IS NOT NULL
  ORDER BY updated_at DESC LIMIT 1;
  SELECT json_build_object('hora_entrada', coalesce(v_cambio, ft.hora_entrada), 'tolerancia_entrada_minutos', COALESCE(ft.tolerancia_entrada_minutos, 5)) INTO v_result
  FROM empleado_turnos et INNER JOIN fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = p_empleado_id AND et.activo = true LIMIT 1;
  RETURN v_result;
END; $function$;

GRANT EXECUTE ON FUNCTION public.kiosk_solicitar_elemento(uuid,text,text,int,text), public.kiosk_items_elementos(), public.kiosk_solicitar_cambio_horario(uuid,date,time,time,text,text,boolean), public.kiosk_mis_metricas(uuid,date) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_solicitud_aprobada() FROM anon, authenticated, public;