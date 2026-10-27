CREATE OR REPLACE FUNCTION public.h2_quitar_importado_aprobado(_turno uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.h2_turnos%ROWTYPE; p public.h2_planes%ROWTYPE; v uuid;
BEGIN
 IF NOT public.h2_es_rrhh() THEN RAISE EXCEPTION 'Solo RRHH puede quitar turnos aprobados'; END IF;
 IF coalesce(trim(_motivo),'')='' THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;
 SELECT * INTO t FROM public.h2_turnos WHERE id=_turno;
 IF NOT FOUND THEN RAISE EXCEPTION 'El turno ya no existe'; END IF;
 SELECT * INTO p FROM public.h2_planes WHERE id=t.plan_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'La semana ya no existe'; END IF;
 IF NOT p.vigente OR p.estado<>'aprobado' THEN RAISE EXCEPTION 'Solo se pueden quitar turnos de la versión aprobada vigente'; END IF;
 IF strpos(coalesce(t.observaciones,''),'Importado de horarios legacy')=0 THEN RAISE EXCEPTION 'Este turno no pertenece a los horarios importados'; END IF;
 UPDATE public.h2_planes SET vigente=false WHERE id=p.id;
 INSERT INTO public.h2_planes(sucursal_id,semana_inicio,version,plan_anterior_id,motivo_version,creado_por)
 VALUES(p.sucursal_id,p.semana_inicio,p.version+1,p.id,trim(_motivo),auth.uid()) RETURNING id INTO v;
 INSERT INTO public.h2_turnos(plan_id,empleado_id,fecha,hora_entrada,hora_salida,puesto_id,sucursal_id,descanso_inicio,descanso_fin,observaciones)
 SELECT v,empleado_id,fecha,hora_entrada,hora_salida,puesto_id,sucursal_id,descanso_inicio,descanso_fin,observaciones
 FROM public.h2_turnos WHERE plan_id=p.id AND id<>_turno;
 INSERT INTO public.h2_historial(plan_id,usuario_id,accion,motivo,detalle)
 VALUES(v,auth.uid(),'nueva_version',trim(_motivo),jsonb_build_object('desde',p.id,'version',p.version+1,'turno_quitado',to_jsonb(t)));
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.h2_quitar_importado_aprobado(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.h2_quitar_importado_aprobado(uuid,text) TO authenticated, service_role;