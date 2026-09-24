
ALTER TABLE public.solicitudes_vacaciones ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'rrhh', ADD COLUMN IF NOT EXISTS aprobado_gerente_por uuid, ADD COLUMN IF NOT EXISTS fecha_aprobacion_gerente timestamptz, ADD COLUMN IF NOT EXISTS comentario_gerente text;
ALTER TABLE public.solicitudes_generales ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'rrhh', ADD COLUMN IF NOT EXISTS aprobado_gerente_por uuid, ADD COLUMN IF NOT EXISTS fecha_aprobacion_gerente timestamptz, ADD COLUMN IF NOT EXISTS comentario_gerente text;
UPDATE public.solicitudes_vacaciones SET etapa='finalizada' WHERE estado<>'pendiente';
UPDATE public.solicitudes_generales SET etapa='finalizada' WHERE estado<>'pendiente';

CREATE OR REPLACE FUNCTION public.set_etapa_inicial_solicitud() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_emp record; v_hay_gerente boolean;
BEGIN
  IF NEW.estado::text <> 'pendiente' THEN NEW.etapa := 'finalizada'; RETURN NEW; END IF;
  SELECT id, rol::text rol, sucursal_id INTO v_emp FROM empleados WHERE id = NEW.empleado_id;
  SELECT EXISTS(SELECT 1 FROM empleados g WHERE g.sucursal_id = v_emp.sucursal_id AND g.rol::text='gerente_sucursal' AND g.activo AND g.id <> v_emp.id) INTO v_hay_gerente;
  IF v_emp.rol IN ('gerente_sucursal','admin_rrhh') OR v_emp.sucursal_id IS NULL OR NOT v_hay_gerente THEN NEW.etapa := 'rrhh'; ELSE NEW.etapa := 'gerente'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_etapa_vac ON public.solicitudes_vacaciones;
CREATE TRIGGER trg_etapa_vac BEFORE INSERT ON public.solicitudes_vacaciones FOR EACH ROW EXECUTE FUNCTION public.set_etapa_inicial_solicitud();
DROP TRIGGER IF EXISTS trg_etapa_gen ON public.solicitudes_generales;
CREATE TRIGGER trg_etapa_gen BEFORE INSERT ON public.solicitudes_generales FOR EACH ROW EXECUTE FUNCTION public.set_etapa_inicial_solicitud();

CREATE OR REPLACE FUNCTION public.gerente_resolver_solicitud(p_tipo text, p_id uuid, p_aprobar boolean, p_comentario text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_me record; v_emp_id uuid; v_etapa text; v_suc uuid;
BEGIN
  SELECT id, rol::text rol, sucursal_id INTO v_me FROM empleados WHERE user_id = auth.uid() LIMIT 1;
  IF v_me.id IS NULL OR v_me.rol NOT IN ('gerente_sucursal','admin_rrhh') THEN RETURN jsonb_build_object('ok',false,'error','Sin permiso'); END IF;
  IF p_tipo = 'vacaciones' THEN SELECT empleado_id, etapa INTO v_emp_id, v_etapa FROM solicitudes_vacaciones WHERE id=p_id;
  ELSE SELECT empleado_id, etapa INTO v_emp_id, v_etapa FROM solicitudes_generales WHERE id=p_id; END IF;
  IF v_emp_id IS NULL OR v_etapa <> 'gerente' THEN RETURN jsonb_build_object('ok',false,'error','La solicitud no está esperando al gerente'); END IF;
  SELECT sucursal_id INTO v_suc FROM empleados WHERE id=v_emp_id;
  IF v_me.rol='gerente_sucursal' AND v_suc IS DISTINCT FROM v_me.sucursal_id THEN RETURN jsonb_build_object('ok',false,'error','No es de tu sucursal'); END IF;
  IF p_tipo = 'vacaciones' THEN
    UPDATE solicitudes_vacaciones SET etapa = CASE WHEN p_aprobar THEN 'rrhh' ELSE 'finalizada' END,
      estado = CASE WHEN p_aprobar THEN estado ELSE 'rechazada' END,
      comentarios_aprobacion = CASE WHEN p_aprobar THEN comentarios_aprobacion ELSE p_comentario END,
      aprobado_gerente_por=v_me.id, fecha_aprobacion_gerente=now(), comentario_gerente=p_comentario WHERE id=p_id;
  ELSE
    UPDATE solicitudes_generales SET etapa = CASE WHEN p_aprobar THEN 'rrhh' ELSE 'finalizada' END,
      estado = CASE WHEN p_aprobar THEN estado ELSE 'rechazada' END,
      aprobado_gerente_por=v_me.id, fecha_aprobacion_gerente=now(), comentario_gerente=p_comentario WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE EXECUTE ON FUNCTION public.gerente_resolver_solicitud(text,uuid,boolean,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gerente_resolver_solicitud(text,uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_finalizada_solicitud() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN IF NEW.estado::text <> 'pendiente' AND OLD.estado::text = 'pendiente' THEN NEW.etapa := 'finalizada'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_fin_vac ON public.solicitudes_vacaciones;
CREATE TRIGGER trg_fin_vac BEFORE UPDATE ON public.solicitudes_vacaciones FOR EACH ROW EXECUTE FUNCTION public.marcar_finalizada_solicitud();
DROP TRIGGER IF EXISTS trg_fin_gen ON public.solicitudes_generales;
CREATE TRIGGER trg_fin_gen BEFORE UPDATE ON public.solicitudes_generales FOR EACH ROW EXECUTE FUNCTION public.marcar_finalizada_solicitud();

ALTER TABLE public.entrevistas_slots ADD COLUMN IF NOT EXISTS uso text NOT NULL DEFAULT 'ambos';

CREATE TABLE public.charlas_rrhh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.entrevistas_slots(id) ON DELETE SET NULL,
  fecha date NOT NULL, hora_inicio time NOT NULL, hora_fin time NOT NULL,
  motivo text, estado text NOT NULL DEFAULT 'confirmada', notas_rrhh text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charlas_rrhh TO authenticated;
GRANT ALL ON public.charlas_rrhh TO service_role;
ALTER TABLE public.charlas_rrhh ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona charlas" ON public.charlas_rrhh FOR ALL TO authenticated USING (public.current_user_role()::text='admin_rrhh') WITH CHECK (public.current_user_role()::text='admin_rrhh');
CREATE TRIGGER trg_charlas_updated BEFORE UPDATE ON public.charlas_rrhh FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.kiosk_mis_pedidos(p_empleado_id uuid)
RETURNS TABLE(id uuid, tipo text, detalle text, estado text, etapa text, comentario text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT v.id, 'vacaciones', to_char(v.fecha_inicio,'DD/MM/YYYY')||' al '||to_char(v.fecha_fin,'DD/MM/YYYY'), v.estado::text, v.etapa, COALESCE(v.comentarios_aprobacion, v.comentario_gerente), v.created_at
  FROM solicitudes_vacaciones v WHERE v.empleado_id=p_empleado_id AND v.created_at > now()-interval '180 days'
  UNION ALL
  SELECT g.id, g.tipo_solicitud::text, COALESCE(g.descripcion,''), g.estado::text, g.etapa, g.comentario_gerente, g.created_at
  FROM solicitudes_generales g WHERE g.empleado_id=p_empleado_id AND g.created_at > now()-interval '180 days'
  UNION ALL
  SELECT c.id, 'charla_rrhh', to_char(s.fecha,'DD/MM/YYYY')||' '||to_char(s.hora_inicio,'HH24:MI'), c.estado, 'finalizada', NULL, c.created_at
  FROM charlas_rrhh c JOIN entrevistas_slots s ON s.id=c.slot_id WHERE c.empleado_id=p_empleado_id AND c.created_at > now()-interval '180 days'
  ORDER BY 7 DESC
$$;
CREATE OR REPLACE FUNCTION public.charla_liberar_slot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NEW.estado='cancelada' AND OLD.estado<>'cancelada' AND NEW.slot_id IS NOT NULL THEN
  UPDATE entrevistas_slots SET estado='disponible' WHERE id=NEW.slot_id AND entrevista_id IS NULL; NEW.slot_id := NULL; END IF; RETURN NEW; END $$;
CREATE TRIGGER trg_charla_liberar BEFORE UPDATE ON public.charlas_rrhh FOR EACH ROW EXECUTE FUNCTION public.charla_liberar_slot();

CREATE OR REPLACE FUNCTION public.kiosk_slots_charla()
RETURNS TABLE(slot_id uuid, fecha date, hora_inicio time, hora_fin time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin FROM entrevistas_slots s
  WHERE s.estado='disponible' AND s.uso IN ('charla','ambos')
    AND (s.fecha > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      OR (s.fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AND s.hora_inicio > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time))
  ORDER BY s.fecha, s.hora_inicio LIMIT 60
$$;

CREATE OR REPLACE FUNCTION public.kiosk_reservar_charla(p_empleado_id uuid, p_slot_id uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_slot record; v_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM empleados WHERE id=p_empleado_id AND activo) THEN RETURN jsonb_build_object('ok',false,'error','Empleado inválido'); END IF;
  IF EXISTS(SELECT 1 FROM charlas_rrhh c WHERE c.empleado_id=p_empleado_id AND c.estado='confirmada' AND c.fecha >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) THEN
    RETURN jsonb_build_object('ok',false,'error','Ya tenés una charla reservada'); END IF;
  UPDATE entrevistas_slots SET estado='reservado' WHERE id=p_slot_id AND estado='disponible' AND uso IN ('charla','ambos') RETURNING * INTO v_slot;
  IF v_slot.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Ese horario ya no está disponible'); END IF;
  INSERT INTO charlas_rrhh(empleado_id, slot_id, fecha, hora_inicio, hora_fin, motivo) VALUES (p_empleado_id, v_slot.id, v_slot.fecha, v_slot.hora_inicio, v_slot.hora_fin, NULLIF(btrim(p_motivo),'')) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id,'fecha',v_slot.fecha,'hora_inicio',v_slot.hora_inicio);
END $$;
GRANT EXECUTE ON FUNCTION public.kiosk_mis_pedidos(uuid), public.kiosk_slots_charla(), public.kiosk_reservar_charla(uuid,uuid,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.entrevista_slots_publicos(_token text)
 RETURNS TABLE(slot_id uuid, fecha date, hora_inicio time without time zone, hora_fin time without time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _config_id uuid;
BEGIN
  SELECT COALESCE(i.config_id, (SELECT id FROM public.entrevistas_config WHERE activo ORDER BY created_at LIMIT 1)) INTO _config_id
  FROM public.entrevistas_invitaciones i WHERE i.token = _token AND i.expira_at > now() AND i.entrevista_id IS NULL;
  IF _config_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin FROM public.entrevistas_slots s
  WHERE s.config_id = _config_id AND s.estado = 'disponible' AND s.uso IN ('entrevista','ambos')
    AND (s.fecha > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      OR (s.fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AND s.hora_inicio > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time))
  ORDER BY s.fecha, s.hora_inicio;
END; $function$;
