
CREATE TABLE public.h2_config (clave text PRIMARY KEY, valor numeric NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.h2_config VALUES ('franja_minutos',30,now()),('descanso_minutos',40,now());

CREATE TABLE public.h2_planes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id),
  semana_inicio date NOT NULL,
  estado text NOT NULL DEFAULT 'borrador',
  version int NOT NULL DEFAULT 1,
  plan_anterior_id uuid REFERENCES public.h2_planes(id),
  vigente boolean NOT NULL DEFAULT true,
  excepcion_motivo text,
  motivo_version text,
  creado_por uuid,
  publicado_at timestamptz, publicado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX h2_planes_vigente_uq ON public.h2_planes(sucursal_id, semana_inicio) WHERE vigente;

CREATE TABLE public.h2_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.h2_planes(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id),
  fecha date NOT NULL,
  hora_entrada time NOT NULL, hora_salida time NOT NULL,
  puesto_id uuid REFERENCES public.puestos(id),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id),
  descanso_inicio time, descanso_fin time,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.h2_turnos(plan_id); CREATE INDEX ON public.h2_turnos(empleado_id, fecha);

CREATE TABLE public.h2_plantillas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL, sucursal_id uuid REFERENCES public.sucursales(id), semanas int NOT NULL DEFAULT 1, activa boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.h2_plantilla_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plantilla_id uuid NOT NULL REFERENCES public.h2_plantillas(id) ON DELETE CASCADE, semana_n int NOT NULL DEFAULT 1, dia_semana int NOT NULL, empleado_id uuid NOT NULL REFERENCES public.empleados(id), hora_entrada time NOT NULL, hora_salida time NOT NULL, puesto_id uuid REFERENCES public.puestos(id), descanso_inicio time, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.h2_reglas_cobertura (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sucursal_id uuid NOT NULL REFERENCES public.sucursales(id), dia_semana int NOT NULL, desde time NOT NULL, hasta time NOT NULL, puesto_id uuid NOT NULL REFERENCES public.puestos(id), minimo int NOT NULL DEFAULT 1, critico boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.empleado_puestos_habilitados (empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE, puesto_id uuid NOT NULL REFERENCES public.puestos(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (empleado_id, puesto_id));
INSERT INTO public.empleado_puestos_habilitados(empleado_id,puesto_id) SELECT id,puesto_id FROM public.empleados WHERE puesto_id IS NOT NULL ON CONFLICT DO NOTHING;

CREATE TABLE public.h2_aprobaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES public.h2_planes(id) ON DELETE CASCADE, version int NOT NULL, usuario_id uuid NOT NULL, decision text NOT NULL, observaciones text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.h2_historial (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid REFERENCES public.h2_planes(id) ON DELETE CASCADE, usuario_id uuid, accion text NOT NULL, motivo text, detalle jsonb, created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT ON public.h2_config, public.h2_planes, public.h2_turnos, public.h2_plantillas, public.h2_plantilla_items, public.h2_reglas_cobertura, public.empleado_puestos_habilitados, public.h2_aprobaciones, public.h2_historial TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.h2_config, public.h2_turnos, public.h2_plantillas, public.h2_plantilla_items, public.h2_reglas_cobertura, public.empleado_puestos_habilitados TO authenticated;
GRANT ALL ON public.h2_config, public.h2_planes, public.h2_turnos, public.h2_plantillas, public.h2_plantilla_items, public.h2_reglas_cobertura, public.empleado_puestos_habilitados, public.h2_aprobaciones, public.h2_historial TO service_role;

ALTER TABLE public.h2_config ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_planes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_turnos ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_plantillas ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_plantilla_items ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_reglas_cobertura ENABLE ROW LEVEL SECURITY; ALTER TABLE public.empleado_puestos_habilitados ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_aprobaciones ENABLE ROW LEVEL SECURITY; ALTER TABLE public.h2_historial ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.h2_es_rrhh() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin_rrhh'::user_role) $$;
CREATE OR REPLACE FUNCTION public.h2_es_gerente_de(_suc uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'gerente_sucursal'::user_role) AND public.current_user_sucursal_id() = _suc $$;

CREATE POLICY "cfg ver" ON public.h2_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfg rrhh" ON public.h2_config FOR ALL TO authenticated USING (h2_es_rrhh()) WITH CHECK (h2_es_rrhh());
CREATE POLICY "planes ver" ON public.h2_planes FOR SELECT TO authenticated USING (h2_es_rrhh() OR h2_es_gerente_de(sucursal_id) OR (estado='publicado' AND vigente));
CREATE POLICY "turnos ver" ON public.h2_turnos FOR SELECT TO authenticated USING (
  h2_es_rrhh() OR EXISTS (SELECT 1 FROM h2_planes p WHERE p.id=plan_id AND h2_es_gerente_de(p.sucursal_id))
  OR (empleado_id = current_empleado_id() AND EXISTS (SELECT 1 FROM h2_planes p WHERE p.id=plan_id AND p.estado='publicado' AND p.vigente)));
CREATE POLICY "turnos editar" ON public.h2_turnos FOR ALL TO authenticated
  USING (h2_es_rrhh() AND EXISTS (SELECT 1 FROM h2_planes p WHERE p.id=plan_id AND p.estado IN ('borrador','devuelto')))
  WITH CHECK (h2_es_rrhh() AND EXISTS (SELECT 1 FROM h2_planes p WHERE p.id=plan_id AND p.estado IN ('borrador','devuelto')));
CREATE POLICY "plantillas ver" ON public.h2_plantillas FOR SELECT TO authenticated USING (h2_es_rrhh());
CREATE POLICY "plantillas rrhh" ON public.h2_plantillas FOR ALL TO authenticated USING (h2_es_rrhh()) WITH CHECK (h2_es_rrhh());
CREATE POLICY "pitems ver" ON public.h2_plantilla_items FOR SELECT TO authenticated USING (h2_es_rrhh());
CREATE POLICY "pitems rrhh" ON public.h2_plantilla_items FOR ALL TO authenticated USING (h2_es_rrhh()) WITH CHECK (h2_es_rrhh());
CREATE POLICY "reglas ver" ON public.h2_reglas_cobertura FOR SELECT TO authenticated USING (h2_es_rrhh() OR h2_es_gerente_de(sucursal_id));
CREATE POLICY "reglas rrhh" ON public.h2_reglas_cobertura FOR ALL TO authenticated USING (h2_es_rrhh()) WITH CHECK (h2_es_rrhh());
CREATE POLICY "hab ver" ON public.empleado_puestos_habilitados FOR SELECT TO authenticated USING (h2_es_rrhh() OR empleado_id=current_empleado_id() OR EXISTS (SELECT 1 FROM empleados e WHERE e.id=empleado_id AND h2_es_gerente_de(e.sucursal_id)));
CREATE POLICY "hab rrhh" ON public.empleado_puestos_habilitados FOR ALL TO authenticated USING (h2_es_rrhh()) WITH CHECK (h2_es_rrhh());
CREATE POLICY "aprob ver" ON public.h2_aprobaciones FOR SELECT TO authenticated USING (h2_es_rrhh() OR EXISTS (SELECT 1 FROM h2_planes p WHERE p.id=plan_id AND h2_es_gerente_de(p.sucursal_id)));
CREATE POLICY "hist ver" ON public.h2_historial FOR SELECT TO authenticated USING (h2_es_rrhh() OR EXISTS (SELECT 1 FROM h2_planes p WHERE p.id=plan_id AND h2_es_gerente_de(p.sucursal_id)));

-- Acciones
CREATE OR REPLACE FUNCTION public.h2_crear_plan(_sucursal uuid, _semana date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid; BEGIN
 IF NOT h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH puede crear semanas'; END IF;
 IF extract(isodow FROM _semana)<>1 THEN RAISE EXCEPTION 'La semana debe empezar un lunes'; END IF;
 SELECT id INTO v FROM h2_planes WHERE sucursal_id=_sucursal AND semana_inicio=_semana AND vigente;
 IF v IS NOT NULL THEN RETURN v; END IF;
 INSERT INTO h2_planes(sucursal_id,semana_inicio,creado_por) VALUES(_sucursal,_semana,auth.uid()) RETURNING id INTO v;
 INSERT INTO h2_historial(plan_id,usuario_id,accion) VALUES(v,auth.uid(),'crear');
 RETURN v; END $$;

CREATE OR REPLACE FUNCTION public.h2_copiar_semana(_origen uuid, _destino uuid) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d int; n int; o record; t record; BEGIN
 IF NOT h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH'; END IF;
 SELECT * INTO o FROM h2_planes WHERE id=_origen; SELECT * INTO t FROM h2_planes WHERE id=_destino;
 IF t.estado NOT IN ('borrador','devuelto') THEN RAISE EXCEPTION 'La semana destino no está en borrador'; END IF;
 d := t.semana_inicio - o.semana_inicio;
 INSERT INTO h2_turnos(plan_id,empleado_id,fecha,hora_entrada,hora_salida,puesto_id,sucursal_id,descanso_inicio,descanso_fin,observaciones)
 SELECT _destino,empleado_id,fecha+d,hora_entrada,hora_salida,puesto_id,t.sucursal_id,descanso_inicio,descanso_fin,observaciones FROM h2_turnos WHERE plan_id=_origen;
 GET DIAGNOSTICS n = ROW_COUNT;
 INSERT INTO h2_historial(plan_id,usuario_id,accion,detalle) VALUES(_destino,auth.uid(),'copiar_semana',jsonb_build_object('origen',_origen,'turnos',n));
 RETURN n; END $$;

CREATE OR REPLACE FUNCTION public.h2_aplicar_plantilla(_plantilla uuid, _destino uuid, _semana_n int) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int; t record; dm int; BEGIN
 IF NOT h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH'; END IF;
 SELECT * INTO t FROM h2_planes WHERE id=_destino;
 IF t.estado NOT IN ('borrador','devuelto') THEN RAISE EXCEPTION 'La semana destino no está en borrador'; END IF;
 SELECT COALESCE((SELECT valor::int FROM h2_config WHERE clave='descanso_minutos'),40) INTO dm;
 INSERT INTO h2_turnos(plan_id,empleado_id,fecha,hora_entrada,hora_salida,puesto_id,sucursal_id,descanso_inicio,descanso_fin)
 SELECT _destino,empleado_id,t.semana_inicio+(dia_semana-1),hora_entrada,hora_salida,puesto_id,t.sucursal_id,descanso_inicio,(descanso_inicio + make_interval(mins=>dm))::time
 FROM h2_plantilla_items WHERE plantilla_id=_plantilla AND semana_n=_semana_n;
 GET DIAGNOSTICS n = ROW_COUNT;
 INSERT INTO h2_historial(plan_id,usuario_id,accion,detalle) VALUES(_destino,auth.uid(),'aplicar_plantilla',jsonb_build_object('plantilla',_plantilla,'semana_n',_semana_n,'turnos',n));
 RETURN n; END $$;

CREATE OR REPLACE FUNCTION public.h2_enviar(_plan uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH'; END IF;
 UPDATE h2_planes SET estado='pendiente',updated_at=now() WHERE id=_plan AND estado IN ('borrador','devuelto');
 IF NOT FOUND THEN RAISE EXCEPTION 'Solo se envía un borrador o devuelto'; END IF;
 INSERT INTO h2_historial(plan_id,usuario_id,accion) VALUES(_plan,auth.uid(),'enviar'); END $$;

CREATE OR REPLACE FUNCTION public.h2_resolver(_plan uuid, _aprobar boolean, _obs text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; BEGIN
 SELECT * INTO p FROM h2_planes WHERE id=_plan;
 IF NOT (h2_es_gerente_de(p.sucursal_id) OR h2_es_rrhh()) THEN RAISE EXCEPTION 'No podés validar esta sucursal'; END IF;
 IF p.estado<>'pendiente' THEN RAISE EXCEPTION 'La semana no está pendiente de validación'; END IF;
 IF NOT _aprobar AND coalesce(trim(_obs),'')='' THEN RAISE EXCEPTION 'Para devolver tenés que escribir observaciones'; END IF;
 UPDATE h2_planes SET estado=CASE WHEN _aprobar THEN 'aprobado' ELSE 'devuelto' END, updated_at=now() WHERE id=_plan;
 INSERT INTO h2_aprobaciones(plan_id,version,usuario_id,decision,observaciones) VALUES(_plan,p.version,auth.uid(),CASE WHEN _aprobar THEN 'aprobado' ELSE 'devuelto' END,_obs);
 INSERT INTO h2_historial(plan_id,usuario_id,accion,motivo) VALUES(_plan,auth.uid(),CASE WHEN _aprobar THEN 'aprobar' ELSE 'devolver' END,_obs); END $$;

CREATE OR REPLACE FUNCTION public.h2_publicar(_plan uuid, _excepcion text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; BEGIN IF NOT h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH publica'; END IF;
 SELECT * INTO p FROM h2_planes WHERE id=_plan;
 IF p.estado='aprobado' THEN NULL;
 ELSIF coalesce(trim(_excepcion),'')<>'' AND p.estado IN ('pendiente','devuelto','borrador') THEN NULL;
 ELSE RAISE EXCEPTION 'Solo se publica una semana aprobada (o con excepción y motivo)'; END IF;
 UPDATE h2_planes SET estado='publicado',publicado_at=now(),publicado_por=auth.uid(),excepcion_motivo=nullif(trim(_excepcion),''),updated_at=now() WHERE id=_plan;
 INSERT INTO h2_historial(plan_id,usuario_id,accion,motivo) VALUES(_plan,auth.uid(),CASE WHEN coalesce(trim(_excepcion),'')<>'' THEN 'publicar_excepcion' ELSE 'publicar' END,_excepcion); END $$;

CREATE OR REPLACE FUNCTION public.h2_nueva_version(_plan uuid, _motivo text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; v uuid; BEGIN IF NOT h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH'; END IF;
 IF coalesce(trim(_motivo),'')='' THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;
 SELECT * INTO p FROM h2_planes WHERE id=_plan AND vigente;
 IF p.estado NOT IN ('aprobado','publicado') THEN RAISE EXCEPTION 'Solo se versiona una semana aprobada o publicada'; END IF;
 -- la versión publicada sigue mandando hasta que se publique la nueva
 UPDATE h2_planes SET vigente=false WHERE id=_plan;
 INSERT INTO h2_planes(sucursal_id,semana_inicio,version,plan_anterior_id,motivo_version,creado_por) VALUES(p.sucursal_id,p.semana_inicio,p.version+1,_plan,_motivo,auth.uid()) RETURNING id INTO v;
 INSERT INTO h2_turnos(plan_id,empleado_id,fecha,hora_entrada,hora_salida,puesto_id,sucursal_id,descanso_inicio,descanso_fin,observaciones)
 SELECT v,empleado_id,fecha,hora_entrada,hora_salida,puesto_id,sucursal_id,descanso_inicio,descanso_fin,observaciones FROM h2_turnos WHERE plan_id=_plan;
 INSERT INTO h2_historial(plan_id,usuario_id,accion,motivo,detalle) VALUES(v,auth.uid(),'nueva_version',_motivo,jsonb_build_object('desde',_plan,'version',p.version+1));
 RETURN v; END $$;

-- Horario publicado que manda para un empleado y fecha (versión publicada más reciente)
CREATE OR REPLACE FUNCTION public.h2_turno_publicado(_empleado uuid, _fecha date)
RETURNS TABLE(hora_entrada time, hora_salida time, descanso_inicio time, descanso_fin time, sucursal_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT t.hora_entrada,t.hora_salida,t.descanso_inicio,t.descanso_fin,t.sucursal_id
 FROM h2_turnos t JOIN h2_planes p ON p.id=t.plan_id
 WHERE t.empleado_id=_empleado AND t.fecha=_fecha AND p.estado='publicado'
 ORDER BY p.version DESC LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.h2_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER h2_turnos_touch BEFORE UPDATE ON public.h2_turnos FOR EACH ROW EXECUTE FUNCTION public.h2_touch();
CREATE TRIGGER h2_planes_touch BEFORE UPDATE ON public.h2_planes FOR EACH ROW EXECUTE FUNCTION public.h2_touch();

CREATE OR REPLACE FUNCTION public.h2_log_turno() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO h2_historial(plan_id,usuario_id,accion,detalle) VALUES(COALESCE(NEW.plan_id,OLD.plan_id),auth.uid(),'turno_'||lower(TG_OP),jsonb_build_object('antes',to_jsonb(OLD),'despues',to_jsonb(NEW))); RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER h2_turnos_log AFTER INSERT OR UPDATE OR DELETE ON public.h2_turnos FOR EACH ROW EXECUTE FUNCTION public.h2_log_turno();

INSERT INTO public.app_pages(nombre, path, icon, orden, roles_permitidos, mostrar_en_sidebar)
SELECT 'Horario 2','/rrhh/horario-2','CalendarClock',50,ARRAY['admin_rrhh','gerente_sucursal'],true
WHERE NOT EXISTS (SELECT 1 FROM public.app_pages WHERE path='/rrhh/horario-2');
