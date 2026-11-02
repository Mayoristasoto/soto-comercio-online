CREATE TABLE public.recalculo_incidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL,
  sucursal_id uuid,
  empleado_id uuid,
  creado_por uuid NOT NULL DEFAULT auth.uid(),
  aplicadas int NOT NULL DEFAULT 0,
  descartadas int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recalculo_incidencias TO authenticated;
GRANT ALL ON public.recalculo_incidencias TO service_role;
ALTER TABLE public.recalculo_incidencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rrhh ve recalculos" ON public.recalculo_incidencias FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin_rrhh'));

CREATE TABLE public.recalculo_incidencias_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recalculo_id uuid NOT NULL REFERENCES public.recalculo_incidencias(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL,
  fecha date NOT NULL,
  tipo text NOT NULL,
  incidencia_id uuid,
  minutos_antes int,
  minutos_despues int,
  hora_programada_antes time,
  hora_programada_despues time,
  fuente text,
  accion text NOT NULL,
  decision text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recalculo_incidencias_items TO authenticated;
GRANT ALL ON public.recalculo_incidencias_items TO service_role;
ALTER TABLE public.recalculo_incidencias_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rrhh ve items recalculo" ON public.recalculo_incidencias_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin_rrhh'));

CREATE TRIGGER trg_recalc_upd BEFORE UPDATE ON public.recalculo_incidencias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_recalc_items_upd BEFORE UPDATE ON public.recalculo_incidencias_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Horario vigente hoy para un día pasado
CREATE OR REPLACE FUNCTION public.resolver_horario_dia(_empleado uuid, _fecha date)
RETURNS TABLE(hora_entrada time, pausa_min int, fuente text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_e time; v_p int; v_f text; r record;
BEGIN
  SELECT ch.hora_entrada_nueva INTO v_e FROM cambios_horario ch
   WHERE ch.empleado_id=_empleado AND ch.fecha=_fecha AND ch.estado='aprobado' AND ch.hora_entrada_nueva IS NOT NULL
   ORDER BY ch.updated_at DESC LIMIT 1;
  IF v_e IS NOT NULL THEN v_f := 'Cambio de horario del '||to_char(_fecha,'DD/MM'); END IF;
  IF v_e IS NULL THEN
    SELECT he.hora_entrada INTO v_e FROM horarios_excepcionales he
     WHERE he.empleado_id=_empleado AND he.fecha=_fecha AND COALESCE(he.estado,'aprobado') IN ('aprobado','aprobada') AND he.hora_entrada IS NOT NULL
     ORDER BY he.updated_at DESC LIMIT 1;
    IF v_e IS NOT NULL THEN v_f := 'Horario excepcional'; END IF;
  END IF;
  SELECT * INTO r FROM h2_turno_publicado(_empleado,_fecha);
  IF r.hora_entrada IS NOT NULL THEN
    IF v_e IS NULL THEN v_e := r.hora_entrada; v_f := 'Horario 2 publicado'; END IF;
    IF r.descanso_inicio IS NOT NULL AND r.descanso_fin IS NOT NULL THEN
      v_p := (EXTRACT(EPOCH FROM (r.descanso_fin - r.descanso_inicio))/60)::int; END IF;
  END IF;
  SELECT COALESCE((ft.horarios_por_dia->(extract(isodow from _fecha)::int::text)->>'hora_entrada')::time, ft.hora_entrada) he,
         ft.duracion_pausa_minutos dp INTO r
  FROM empleado_turnos et JOIN fichado_turnos ft ON ft.id=et.turno_id
  WHERE et.empleado_id=_empleado AND ft.activo AND (et.fecha_inicio IS NULL OR et.fecha_inicio<=_fecha)
    AND (et.fecha_fin IS NULL OR et.fecha_fin>=_fecha)
  ORDER BY et.activo DESC, et.fecha_inicio DESC NULLS LAST LIMIT 1;
  IF FOUND THEN
    IF v_e IS NULL THEN v_e := r.he; v_f := 'Horario fijo'; END IF;
    IF v_p IS NULL THEN v_p := r.dp; END IF;
  END IF;
  hora_entrada := v_e; pausa_min := v_p; fuente := v_f; RETURN NEXT;
END $$;
REVOKE EXECUTE ON FUNCTION public.resolver_horario_dia(uuid,date) FROM PUBLIC, anon;

-- Vista previa: no escribe nada
CREATE OR REPLACE FUNCTION public.recalcular_incidencias_preview(_mes date, _sucursal uuid DEFAULT NULL, _empleado uuid DEFAULT NULL)
RETURNS TABLE(empleado_id uuid, empleado text, fecha date, tipo text, incidencia_id uuid, justificado boolean,
  minutos_antes int, hora_programada_antes time, minutos_despues int, hora_programada_despues time,
  hora_real time, hora_fin time, fuente text, omitido text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE d1 date := date_trunc('month',_mes)::date; d2 date := (date_trunc('month',_mes)+interval '1 month - 1 day')::date;
  tol numeric := COALESCE((SELECT NULLIF(valor,'')::numeric FROM fichado_configuracion WHERE clave='exigencia_tolerancia_llegada_min'),0);
  tolp numeric := public.cfg_num('exigencia_tolerancia_pausa_min',0);
BEGIN
  IF NOT has_role(auth.uid(),'admin_rrhh') THEN RAISE EXCEPTION 'Solo RRHH'; END IF;
  RETURN QUERY
  WITH emps AS (SELECT e.id, e.nombre||' '||e.apellido nom FROM empleados e
     WHERE (_sucursal IS NULL OR e.sucursal_id=_sucursal) AND (_empleado IS NULL OR e.id=_empleado)),
  ent AS (SELECT f.empleado_id eid, (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date fe,
            min((f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time) hr
          FROM fichajes f JOIN emps ON emps.id=f.empleado_id
          WHERE f.tipo='entrada' AND f.estado='valido'
            AND (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date BETWEEN d1 AND d2 GROUP BY 1,2),
  tar AS (SELECT ft.* FROM fichajes_tardios ft JOIN emps ON emps.id=ft.empleado_id WHERE ft.fecha_fichaje BETWEEN d1 AND d2),
  base AS (SELECT COALESCE(ent.eid,tar.empleado_id) eid, COALESCE(ent.fe,tar.fecha_fichaje) fe, ent.hr, tar.id tid,
             tar.justificado tj, tar.minutos_retraso tm, tar.hora_programada thp, tar.hora_real thr
           FROM ent FULL JOIN tar ON tar.empleado_id=ent.eid AND tar.fecha_fichaje=ent.fe),
  pi AS (SELECT f.empleado_id eid, f.timestamp_real ts, (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date fe,
           (SELECT min(f2.timestamp_real) FROM fichajes f2 WHERE f2.empleado_id=f.empleado_id AND f2.tipo='pausa_fin' AND f2.estado='valido'
              AND f2.timestamp_real>f.timestamp_real
              AND (f2.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date=(f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) tf
         FROM fichajes f JOIN emps ON emps.id=f.empleado_id
         WHERE f.tipo='pausa_inicio' AND f.estado='valido'
           AND (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date BETWEEN d1 AND d2),
  pa AS (SELECT pe.* FROM fichajes_pausas_excedidas pe JOIN emps ON emps.id=pe.empleado_id WHERE pe.fecha_fichaje BETWEEN d1 AND d2),
  pbase AS (SELECT COALESCE(pi.eid,pa.empleado_id) eid, COALESCE(pi.fe,pa.fecha_fichaje) fe,
              COALESCE((pi.ts AT TIME ZONE 'America/Argentina/Buenos_Aires')::time, pa.hora_inicio_pausa) hi,
              COALESCE((pi.tf AT TIME ZONE 'America/Argentina/Buenos_Aires')::time, pa.hora_fin_pausa) hf,
              CASE WHEN pi.tf IS NOT NULL THEN floor(EXTRACT(EPOCH FROM (pi.tf-pi.ts))/60)::int END dur,
              pa.id pid, pa.justificado pj, pa.minutos_exceso pm, pa.duracion_permitida_minutos pp
            FROM (SELECT * FROM pi WHERE tf IS NOT NULL) pi FULL JOIN pa ON pa.empleado_id=pi.eid AND pa.fecha_fichaje=pi.fe
              AND date_trunc('minute',pa.hora_inicio_pausa)=date_trunc('minute',(pi.ts AT TIME ZONE 'America/Argentina/Buenos_Aires')::time)),
  omit AS (SELECT x.eid, x.fe,
     CASE WHEN extract(isodow from x.fe)=7 THEN 'Domingo'
          WHEN EXISTS(SELECT 1 FROM dias_feriados df WHERE df.fecha=x.fe AND df.activo) THEN 'Feriado'
          WHEN EXISTS(SELECT 1 FROM solicitudes_vacaciones sv WHERE sv.empleado_id=x.eid AND sv.estado IN ('aprobada','gozadas') AND x.fe BETWEEN sv.fecha_inicio AND sv.fecha_fin) THEN 'Vacaciones'
     END mo FROM (SELECT eid,fe FROM base UNION SELECT eid,fe FROM pbase) x)
  SELECT b.eid, emps.nom, b.fe, 'llegada_tarde'::text, b.tid, COALESCE(b.tj,false), b.tm, b.thp,
    CASE WHEN o.mo IS NULL AND b.hr IS NOT NULL AND h.hora_entrada IS NOT NULL
      THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (b.hr - (h.hora_entrada + tol*interval '1 minute')))/60))::int END,
    h.hora_entrada, COALESCE(b.hr,b.thr), NULL::time, h.fuente, o.mo
  FROM base b JOIN emps ON emps.id=b.eid JOIN omit o ON o.eid=b.eid AND o.fe=b.fe
  LEFT JOIN LATERAL resolver_horario_dia(b.eid,b.fe) h ON true
  UNION ALL
  SELECT p.eid, emps.nom, p.fe, 'pausa_excedida', p.pid, COALESCE(p.pj,false), p.pm, NULL::time,
    CASE WHEN o.mo IS NULL AND p.dur IS NOT NULL AND h.pausa_min IS NOT NULL
      THEN GREATEST(0, p.dur - h.pausa_min - tolp::int) END,
    NULL::time, p.hi, p.hf, CASE WHEN h.pausa_min IS NOT NULL THEN 'Descanso permitido '||h.pausa_min||' min ('||h.fuente||')' END, o.mo
  FROM pbase p JOIN emps ON emps.id=p.eid JOIN omit o ON o.eid=p.eid AND o.fe=p.fe
  LEFT JOIN LATERAL resolver_horario_dia(p.eid,p.fe) h ON true
  ORDER BY 2,3,4;
END $$;
REVOKE EXECUTE ON FUNCTION public.recalcular_incidencias_preview(date,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_incidencias_preview(date,uuid,uuid) TO authenticated;

-- Aplicar decisiones (atómico)
CREATE OR REPLACE FUNCTION public.aplicar_recalculo_incidencias(_mes date, _sucursal uuid, _empleado uuid, _items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; it jsonb; v_ap int:=0; v_de int:=0; v_acc text; v_dec text; v_emp uuid; v_fe date; v_tipo text; v_inc uuid;
  v_min int; v_hp time; v_hr time; v_hf time; v_anul uuid;
  v_mot text := 'Recálculo por cambio de horario retroactivo';
BEGIN
  IF NOT has_role(auth.uid(),'admin_rrhh') THEN RAISE EXCEPTION 'Solo RRHH'; END IF;
  SELECT id INTO v_anul FROM empleados WHERE user_id=auth.uid() LIMIT 1;
  INSERT INTO recalculo_incidencias(mes,sucursal_id,empleado_id) VALUES (date_trunc('month',_mes)::date,_sucursal,_empleado) RETURNING id INTO v_id;
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_acc := it->>'accion'; v_dec := it->>'decision'; v_emp := (it->>'empleado_id')::uuid; v_fe := (it->>'fecha')::date;
    v_tipo := it->>'tipo'; v_inc := NULLIF(it->>'incidencia_id','')::uuid; v_min := NULLIF(it->>'minutos_despues','')::int;
    v_hp := NULLIF(it->>'hora_programada_despues','')::time; v_hr := NULLIF(it->>'hora_real','')::time; v_hf := NULLIF(it->>'hora_fin','')::time;
    IF v_dec='aplicar' THEN
      v_ap := v_ap+1;
      IF v_acc='anular' THEN
        IF v_tipo='llegada_tarde' THEN
          UPDATE fichajes_tardios SET justificado=true, observaciones=COALESCE(observaciones||' · ','')||v_mot WHERE id=v_inc;
        ELSE
          UPDATE fichajes_pausas_excedidas SET justificado=true, observaciones=COALESCE(observaciones||' · ','')||v_mot WHERE id=v_inc;
        END IF;
        UPDATE empleado_cruces_rojas SET anulada=true, anulada_por=v_anul, motivo_anulacion=v_mot
          WHERE empleado_id=v_emp AND fecha_infraccion=v_fe AND tipo_infraccion=v_tipo AND NOT COALESCE(anulada,false);
      ELSIF v_acc='actualizar' THEN
        IF v_tipo='llegada_tarde' THEN
          UPDATE fichajes_tardios SET minutos_retraso=v_min, hora_programada=COALESCE(v_hp,hora_programada),
            observaciones=COALESCE(observaciones||' · ','')||'Recalculado' WHERE id=v_inc;
        ELSE
          UPDATE fichajes_pausas_excedidas SET minutos_exceso=v_min, duracion_permitida_minutos=duracion_minutos-v_min,
            observaciones=COALESCE(observaciones||' · ','')||'Recalculado' WHERE id=v_inc;
        END IF;
        UPDATE empleado_cruces_rojas SET minutos_diferencia=v_min
          WHERE empleado_id=v_emp AND fecha_infraccion=v_fe AND tipo_infraccion=v_tipo AND NOT COALESCE(anulada,false);
      ELSIF v_acc='crear' THEN
        IF v_tipo='llegada_tarde' THEN
          INSERT INTO fichajes_tardios(empleado_id,fecha_fichaje,hora_programada,hora_real,minutos_retraso,observaciones)
            VALUES (v_emp,v_fe,v_hp,v_hr,v_min,'Creada por recálculo retroactivo') RETURNING id INTO v_inc;
        ELSE
          INSERT INTO fichajes_pausas_excedidas(empleado_id,fecha_fichaje,hora_inicio_pausa,hora_fin_pausa,duracion_minutos,duracion_permitida_minutos,minutos_exceso,observaciones)
            VALUES (v_emp,v_fe,v_hr,v_hf,(EXTRACT(EPOCH FROM (v_hf-v_hr))/60)::int,(EXTRACT(EPOCH FROM (v_hf-v_hr))/60)::int-v_min,v_min,'Creada por recálculo retroactivo') RETURNING id INTO v_inc;
        END IF;
        INSERT INTO empleado_cruces_rojas(empleado_id,tipo_infraccion,fecha_infraccion,minutos_diferencia,observaciones)
          VALUES (v_emp,v_tipo,v_fe,v_min,'Creada por recálculo retroactivo');
      END IF;
    ELSE v_de := v_de+1; END IF;
    INSERT INTO recalculo_incidencias_items(recalculo_id,empleado_id,fecha,tipo,incidencia_id,minutos_antes,minutos_despues,
      hora_programada_antes,hora_programada_despues,fuente,accion,decision)
    VALUES (v_id,v_emp,v_fe,v_tipo,v_inc,NULLIF(it->>'minutos_antes','')::int,v_min,NULLIF(it->>'hora_programada_antes','')::time,v_hp,it->>'fuente',v_acc,v_dec);
  END LOOP;
  UPDATE recalculo_incidencias SET aplicadas=v_ap, descartadas=v_de WHERE id=v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.aplicar_recalculo_incidencias(date,uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aplicar_recalculo_incidencias(date,uuid,uuid,jsonb) TO authenticated;