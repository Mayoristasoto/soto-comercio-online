ALTER TABLE public.entrevistas_invitaciones ALTER COLUMN candidato_id DROP NOT NULL;
ALTER TABLE public.entrevistas_invitaciones ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'candidato';
ALTER TABLE public.entrevistas_invitaciones ADD COLUMN IF NOT EXISTS etiqueta text;

-- datos de la invitacion (soporta enlace abierto sin candidato)
CREATE OR REPLACE FUNCTION public.entrevista_datos_invitacion(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _res jsonb;
BEGIN
  SELECT i.id, i.estado, i.expira_at, i.entrevista_id, i.config_id, i.tipo,
         c.nombre, p.nombre AS puesto
  INTO _inv
  FROM public.entrevistas_invitaciones i
  LEFT JOIN public.candidatos c ON c.id = i.candidato_id
  LEFT JOIN public.reclutamiento_puestos p ON p.id = c.puesto_id
  WHERE i.token = _token;

  IF _inv.id IS NULL THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'inexistente');
  END IF;

  IF _inv.expira_at < now() THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'expirada');
  END IF;

  _res := jsonb_build_object(
    'valido', true,
    'tipo', _inv.tipo,
    'nombre', COALESCE(split_part(_inv.nombre, ' ', 1), ''),
    'puesto', COALESCE(_inv.puesto, ''),
    'estado', _inv.estado
  );

  IF _inv.entrevista_id IS NOT NULL THEN
    SELECT _res || jsonb_build_object(
      'reservada', true,
      'fecha', e.fecha,
      'hora_inicio', e.hora_inicio,
      'hora_fin', e.hora_fin,
      'direccion', COALESCE(e.direccion, '')
    ) INTO _res
    FROM public.entrevistas e WHERE e.id = _inv.entrevista_id;
  ELSE
    _res := _res || jsonb_build_object(
      'reservada', false,
      'direccion', COALESCE(
        (SELECT cf.direccion FROM public.entrevistas_config cf
          WHERE cf.id = COALESCE(_inv.config_id, (SELECT id FROM public.entrevistas_config WHERE activo ORDER BY created_at LIMIT 1))),
        ''
      )
    );
  END IF;

  RETURN _res;
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_datos_invitacion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_datos_invitacion(text) TO anon, authenticated, service_role;

-- lista de puestos para el enlace publico
CREATE OR REPLACE FUNCTION public.entrevista_puestos_publicos(_token text)
RETURNS TABLE (id uuid, nombre text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.entrevistas_invitaciones i
    WHERE i.token = _token AND i.expira_at > now() AND i.entrevista_id IS NULL
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT p.id, p.nombre FROM public.reclutamiento_puestos p WHERE p.activo ORDER BY p.orden;
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_puestos_publicos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_puestos_publicos(text) TO anon, authenticated, service_role;

-- reserva desde enlace publico de un solo uso
CREATE OR REPLACE FUNCTION public.entrevista_reservar_abierta(
  _token text, _slot_id uuid, _nombre text, _apellido text, _telefono text, _puesto_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _slot record;
  _cfg record;
  _cand uuid;
  _entrevista_id uuid;
BEGIN
  IF _nombre IS NULL OR btrim(_nombre) = '' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'datos_incompletos');
  END IF;

  SELECT * INTO _inv FROM public.entrevistas_invitaciones WHERE token = _token;

  IF _inv.id IS NULL OR _inv.expira_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'invitacion_invalida');
  END IF;

  IF _inv.entrevista_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ya_reservada');
  END IF;

  UPDATE public.entrevistas_slots
  SET estado = 'reservado'
  WHERE id = _slot_id AND estado = 'disponible'
  RETURNING * INTO _slot;

  IF _slot.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'slot_ocupado');
  END IF;

  SELECT * INTO _cfg FROM public.entrevistas_config WHERE id = _slot.config_id;

  IF _inv.candidato_id IS NOT NULL THEN
    _cand := _inv.candidato_id;
    UPDATE public.candidatos
    SET telefono = COALESCE(NULLIF(btrim(_telefono), ''), telefono),
        puesto_id = COALESCE(_puesto_id, puesto_id)
    WHERE id = _cand;
  ELSE
    INSERT INTO public.candidatos (nombre, apellido, telefono, puesto_id, estado, origen)
    VALUES (btrim(_nombre), NULLIF(btrim(_apellido), ''), NULLIF(btrim(_telefono), ''), _puesto_id, 'entrevista_confirmada', 'link_publico')
    RETURNING id INTO _cand;

    UPDATE public.entrevistas_invitaciones SET candidato_id = _cand WHERE id = _inv.id;
  END IF;

  INSERT INTO public.entrevistas (candidato_id, slot_id, puesto_id, sucursal_id, direccion, fecha, hora_inicio, hora_fin, estado, reservado_at)
  VALUES (_cand, _slot.id, _puesto_id, _cfg.sucursal_id, _cfg.direccion, _slot.fecha, _slot.hora_inicio, _slot.hora_fin, 'confirmada', now())
  RETURNING id INTO _entrevista_id;

  UPDATE public.entrevistas_slots SET entrevista_id = _entrevista_id WHERE id = _slot.id;

  UPDATE public.entrevistas_invitaciones
  SET entrevista_id = _entrevista_id, booked_at = now(), estado = 'reservada'
  WHERE id = _inv.id;

  UPDATE public.candidatos SET estado = 'entrevista_confirmada' WHERE id = _cand;

  RETURN jsonb_build_object(
    'ok', true,
    'fecha', _slot.fecha,
    'hora_inicio', _slot.hora_inicio,
    'hora_fin', _slot.hora_fin,
    'direccion', COALESCE(_cfg.direccion, '')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_reservar_abierta(text, uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_reservar_abierta(text, uuid, text, text, text, uuid) TO anon, authenticated, service_role;

-- slots publicos: tambien valido para enlace abierto (sin candidato)
CREATE OR REPLACE FUNCTION public.entrevista_slots_publicos(_token text)
RETURNS TABLE (slot_id uuid, fecha date, hora_inicio time, hora_fin time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config_id uuid;
BEGIN
  SELECT COALESCE(i.config_id, (SELECT id FROM public.entrevistas_config WHERE activo ORDER BY created_at LIMIT 1))
  INTO _config_id
  FROM public.entrevistas_invitaciones i
  WHERE i.token = _token AND i.expira_at > now() AND i.entrevista_id IS NULL;

  IF _config_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin
  FROM public.entrevistas_slots s
  WHERE s.config_id = _config_id
    AND s.estado = 'disponible'
    AND (s.fecha > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
         OR (s.fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
             AND s.hora_inicio > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time))
  ORDER BY s.fecha, s.hora_inicio;
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_slots_publicos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_slots_publicos(text) TO anon, authenticated, service_role;