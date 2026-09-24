CREATE OR REPLACE FUNCTION public.kiosk_solicitar_adelanto(p_empleado_id uuid, p_monto numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM empleados WHERE id=p_empleado_id AND activo) THEN RETURN jsonb_build_object('ok',false,'error','Empleado inválido'); END IF;
  IF p_monto IS NULL OR p_monto <= 0 OR p_monto > 1000000 THEN RETURN jsonb_build_object('ok',false,'error','Monto inválido'); END IF;
  INSERT INTO solicitudes_generales(empleado_id, tipo_solicitud, fecha_solicitud, monto, descripcion, estado, etapa)
  VALUES (p_empleado_id, 'adelanto_sueldo', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date, p_monto,
    'Solicitud de adelanto de $' || to_char(p_monto,'FM999G999G999'), 'pendiente', 'rrhh') RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'id',v_id);
END $$;
GRANT EXECUTE ON FUNCTION public.kiosk_solicitar_adelanto(uuid,numeric) TO anon, authenticated;