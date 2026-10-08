CREATE OR REPLACE FUNCTION public.kiosk_solicitar_cambio_horario(p_empleado_id uuid, p_fecha date, p_entrada time without time zone, p_salida time without time zone, p_motivo text, p_detalle text, p_compensar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date; v_min_dias int;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM empleados WHERE id=p_empleado_id AND activo) THEN RETURN jsonb_build_object('ok',false,'error','Empleado inválido'); END IF;
  SELECT coalesce((opciones->>'dias_anticipacion')::int,0) INTO v_min_dias FROM autogestion_secciones WHERE clave='cambio_horario' LIMIT 1;
  v_min_dias := coalesce(v_min_dias,0);
  IF p_fecha IS NULL OR p_fecha < v_hoy + v_min_dias OR p_fecha > v_hoy + 90 THEN
    RETURN jsonb_build_object('ok',false,'error',CASE WHEN v_min_dias>0 THEN 'Tenés que pedirlo con al menos '||v_min_dias||' días de anticipación' ELSE 'Fecha inválida' END);
  END IF;
  IF p_entrada IS NULL OR p_salida IS NULL OR p_salida <= p_entrada THEN RETURN jsonb_build_object('ok',false,'error','Horario inválido'); END IF;
  INSERT INTO solicitudes_generales(empleado_id, tipo_solicitud, fecha_solicitud, descripcion, estado, etapa, datos)
  VALUES (p_empleado_id,'cambio_horario',v_hoy,
    to_char(p_fecha,'DD/MM/YYYY')||' '||to_char(p_entrada,'HH24:MI')||'–'||to_char(p_salida,'HH24:MI')||' ('||left(coalesce(p_motivo,'otro'),40)||')',
    'pendiente','gerente', jsonb_build_object('fecha',p_fecha,'entrada',to_char(p_entrada,'HH24:MI'),'salida',to_char(p_salida,'HH24:MI'),'motivo',left(coalesce(p_motivo,''),40),'detalle',left(coalesce(p_detalle,''),300),'compensar',coalesce(p_compensar,false)))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
END $function$;