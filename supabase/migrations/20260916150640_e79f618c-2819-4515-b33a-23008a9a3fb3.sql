-- ENUMS
CREATE TYPE public.candidato_estado AS ENUM ('nuevo','preseleccionado','seleccionado_entrevista','invitacion_generada','pendiente_reserva','entrevista_confirmada','entrevistado','no_asistio','descartado','seleccionado');
CREATE TYPE public.slot_estado AS ENUM ('disponible','reservado','bloqueado');
CREATE TYPE public.entrevista_estado AS ENUM ('pendiente','confirmada','realizada','no_asistio','cancelada');
CREATE TYPE public.disponibilidad_excepcion_tipo AS ENUM ('bloqueo_dia','disponibilidad_extra');

-- PUESTOS
CREATE TABLE public.reclutamiento_puestos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reclutamiento_puestos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reclutamiento_puestos TO authenticated;
GRANT ALL ON public.reclutamiento_puestos TO service_role;
ALTER TABLE public.reclutamiento_puestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "puestos_reclutamiento_admin_all" ON public.reclutamiento_puestos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "puestos_reclutamiento_lectura" ON public.reclutamiento_puestos FOR SELECT TO authenticated USING (true);

-- CANDIDATOS
CREATE TABLE public.candidatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  apellido text,
  telefono text,
  email text,
  puesto_id uuid REFERENCES public.reclutamiento_puestos(id) ON DELETE SET NULL,
  estado public.candidato_estado NOT NULL DEFAULT 'nuevo',
  origen text NOT NULL DEFAULT 'manual',
  notas text,
  cv_url text,
  datos_extraidos jsonb,
  scoring numeric,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidatos_puesto ON public.candidatos(puesto_id);
CREATE INDEX idx_candidatos_estado ON public.candidatos(estado);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidatos TO authenticated;
GRANT ALL ON public.candidatos TO service_role;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidatos_admin_all" ON public.candidatos FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "candidatos_gerente_lee" ON public.candidatos FOR SELECT TO authenticated USING (public.current_user_role() = 'gerente_sucursal');

-- CONFIG
CREATE TABLE public.entrevistas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL DEFAULT 'Entrevistas RRHH',
  duracion_minutos integer NOT NULL DEFAULT 30,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  direccion text,
  mensaje_whatsapp text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrevistas_config TO authenticated;
GRANT ALL ON public.entrevistas_config TO service_role;
ALTER TABLE public.entrevistas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entrevistas_config_admin_all" ON public.entrevistas_config FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "entrevistas_config_lectura" ON public.entrevistas_config FOR SELECT TO authenticated USING (true);

-- DISPONIBILIDAD SEMANAL
CREATE TABLE public.entrevistas_disponibilidad (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id uuid NOT NULL REFERENCES public.entrevistas_config(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_disponibilidad_config ON public.entrevistas_disponibilidad(config_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrevistas_disponibilidad TO authenticated;
GRANT ALL ON public.entrevistas_disponibilidad TO service_role;
ALTER TABLE public.entrevistas_disponibilidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disponibilidad_admin_all" ON public.entrevistas_disponibilidad FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "disponibilidad_lectura" ON public.entrevistas_disponibilidad FOR SELECT TO authenticated USING (true);

-- EXCEPCIONES POR FECHA
CREATE TABLE public.entrevistas_excepciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id uuid NOT NULL REFERENCES public.entrevistas_config(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  tipo public.disponibilidad_excepcion_tipo NOT NULL,
  hora_inicio time,
  hora_fin time,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_excepciones_config_fecha ON public.entrevistas_excepciones(config_id, fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrevistas_excepciones TO authenticated;
GRANT ALL ON public.entrevistas_excepciones TO service_role;
ALTER TABLE public.entrevistas_excepciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "excepciones_admin_all" ON public.entrevistas_excepciones FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "excepciones_lectura" ON public.entrevistas_excepciones FOR SELECT TO authenticated USING (true);

-- SLOTS
CREATE TABLE public.entrevistas_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id uuid NOT NULL REFERENCES public.entrevistas_config(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado public.slot_estado NOT NULL DEFAULT 'disponible',
  entrevista_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_slot_config_fecha_hora ON public.entrevistas_slots(config_id, fecha, hora_inicio);
CREATE INDEX idx_slots_fecha_estado ON public.entrevistas_slots(fecha, estado);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrevistas_slots TO authenticated;
GRANT ALL ON public.entrevistas_slots TO service_role;
ALTER TABLE public.entrevistas_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots_admin_all" ON public.entrevistas_slots FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "slots_lectura" ON public.entrevistas_slots FOR SELECT TO authenticated USING (true);

-- ENTREVISTAS
CREATE TABLE public.entrevistas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.entrevistas_slots(id) ON DELETE SET NULL,
  puesto_id uuid REFERENCES public.reclutamiento_puestos(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  direccion text,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado public.entrevista_estado NOT NULL DEFAULT 'confirmada',
  reservado_at timestamptz,
  notas text,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_entrevistas_fecha ON public.entrevistas(fecha);
CREATE INDEX idx_entrevistas_candidato ON public.entrevistas(candidato_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrevistas TO authenticated;
GRANT ALL ON public.entrevistas TO service_role;
ALTER TABLE public.entrevistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entrevistas_admin_all" ON public.entrevistas FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "entrevistas_gerente_lee" ON public.entrevistas FOR SELECT TO authenticated USING (public.current_user_role() = 'gerente_sucursal');

ALTER TABLE public.entrevistas_slots ADD CONSTRAINT fk_slot_entrevista FOREIGN KEY (entrevista_id) REFERENCES public.entrevistas(id) ON DELETE SET NULL;

-- INVITACIONES
CREATE TABLE public.entrevistas_invitaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  config_id uuid REFERENCES public.entrevistas_config(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'pendiente',
  expira_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  invited_at timestamptz NOT NULL DEFAULT now(),
  booked_at timestamptz,
  entrevista_id uuid REFERENCES public.entrevistas(id) ON DELETE SET NULL,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invitaciones_candidato ON public.entrevistas_invitaciones(candidato_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrevistas_invitaciones TO authenticated;
GRANT ALL ON public.entrevistas_invitaciones TO service_role;
ALTER TABLE public.entrevistas_invitaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitaciones_admin_all" ON public.entrevistas_invitaciones FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());
CREATE POLICY "invitaciones_gerente_lee" ON public.entrevistas_invitaciones FOR SELECT TO authenticated USING (public.current_user_role() = 'gerente_sucursal');

-- TRIGGERS updated_at
CREATE TRIGGER trg_upd_reclutamiento_puestos BEFORE UPDATE ON public.reclutamiento_puestos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_candidatos BEFORE UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_entrevistas_config BEFORE UPDATE ON public.entrevistas_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_entrevistas_disp BEFORE UPDATE ON public.entrevistas_disponibilidad FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_entrevistas_exc BEFORE UPDATE ON public.entrevistas_excepciones FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_entrevistas_slots BEFORE UPDATE ON public.entrevistas_slots FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_entrevistas BEFORE UPDATE ON public.entrevistas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_upd_entrevistas_inv BEFORE UPDATE ON public.entrevistas_invitaciones FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SEMILLA PUESTOS
INSERT INTO public.reclutamiento_puestos (nombre, orden) VALUES
  ('Cajero/a', 1), ('Repositor/a', 2), ('Encargado/a', 3), ('Logística', 4)
ON CONFLICT (nombre) DO NOTHING;

-- GENERACION DE SLOTS
CREATE OR REPLACE FUNCTION public.entrevistas_generar_slots(_config_id uuid, _desde date, _hasta date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dur integer;
  _d date;
  _regla record;
  _t time;
  _creados integer := 0;
BEGIN
  IF NOT public.is_admin_rrhh() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT duracion_minutos INTO _dur FROM public.entrevistas_config WHERE id = _config_id;
  IF _dur IS NULL THEN
    RAISE EXCEPTION 'Configuración inexistente';
  END IF;

  -- limpiar slots disponibles futuros del rango (no toca reservados ni bloqueados)
  DELETE FROM public.entrevistas_slots
  WHERE config_id = _config_id AND fecha BETWEEN _desde AND _hasta AND estado = 'disponible';

  _d := _desde;
  WHILE _d <= _hasta LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.entrevistas_excepciones
      WHERE config_id = _config_id AND fecha = _d AND tipo = 'bloqueo_dia'
    ) THEN
      FOR _regla IN
        SELECT hora_inicio, hora_fin FROM public.entrevistas_disponibilidad
        WHERE config_id = _config_id AND activo = true AND dia_semana = EXTRACT(DOW FROM _d)::int
        UNION ALL
        SELECT hora_inicio, hora_fin FROM public.entrevistas_excepciones
        WHERE config_id = _config_id AND fecha = _d AND tipo = 'disponibilidad_extra'
          AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL
      LOOP
        _t := _regla.hora_inicio;
        WHILE _t + (_dur || ' minutes')::interval <= _regla.hora_fin LOOP
          INSERT INTO public.entrevistas_slots (config_id, fecha, hora_inicio, hora_fin)
          VALUES (_config_id, _d, _t, (_t + (_dur || ' minutes')::interval)::time)
          ON CONFLICT (config_id, fecha, hora_inicio) DO NOTHING;
          IF FOUND THEN _creados := _creados + 1; END IF;
          _t := (_t + (_dur || ' minutes')::interval)::time;
        END LOOP;
      END LOOP;
    END IF;
    _d := _d + 1;
  END LOOP;

  RETURN _creados;
END;
$$;
REVOKE ALL ON FUNCTION public.entrevistas_generar_slots(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevistas_generar_slots(uuid, date, date) TO authenticated, service_role;

-- DATOS PUBLICOS DEL CANDIDATO POR TOKEN
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
  SELECT i.id, i.estado, i.expira_at, i.entrevista_id, i.config_id, c.nombre, p.nombre AS puesto
  INTO _inv
  FROM public.entrevistas_invitaciones i
  JOIN public.candidatos c ON c.id = i.candidato_id
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
    'nombre', split_part(_inv.nombre, ' ', 1),
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
    SELECT _res || jsonb_build_object('reservada', false, 'direccion', COALESCE(cf.direccion, ''))
    INTO _res
    FROM public.entrevistas_config cf
    WHERE cf.id = COALESCE(_inv.config_id, (SELECT id FROM public.entrevistas_config WHERE activo LIMIT 1));
    _res := COALESCE(_res, jsonb_build_object('valido', true, 'reservada', false, 'nombre', split_part(_inv.nombre,' ',1), 'puesto', COALESCE(_inv.puesto,''), 'direccion', ''));
  END IF;

  RETURN _res;
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_datos_invitacion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_datos_invitacion(text) TO anon, authenticated, service_role;

-- SLOTS PUBLICOS
CREATE OR REPLACE FUNCTION public.entrevista_slots_publicos(_token text)
RETURNS TABLE (slot_id uuid, fecha date, hora_inicio time, hora_fin time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config_id uuid;
BEGIN
  SELECT COALESCE(i.config_id, (SELECT id FROM public.entrevistas_config WHERE activo LIMIT 1))
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

-- RESERVA ATOMICA
CREATE OR REPLACE FUNCTION public.entrevista_reservar(_token text, _slot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _slot record;
  _cfg record;
  _entrevista_id uuid;
BEGIN
  SELECT i.*, c.puesto_id
  INTO _inv
  FROM public.entrevistas_invitaciones i
  JOIN public.candidatos c ON c.id = i.candidato_id
  WHERE i.token = _token;

  IF _inv.id IS NULL OR _inv.expira_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'invitacion_invalida');
  END IF;

  IF _inv.entrevista_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ya_reservada');
  END IF;

  -- reserva atomica: solo gana quien encuentre el slot disponible
  UPDATE public.entrevistas_slots
  SET estado = 'reservado'
  WHERE id = _slot_id AND estado = 'disponible'
  RETURNING * INTO _slot;

  IF _slot.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'slot_ocupado');
  END IF;

  SELECT * INTO _cfg FROM public.entrevistas_config WHERE id = _slot.config_id;

  INSERT INTO public.entrevistas (candidato_id, slot_id, puesto_id, sucursal_id, direccion, fecha, hora_inicio, hora_fin, estado, reservado_at)
  VALUES (_inv.candidato_id, _slot.id, _inv.puesto_id, _cfg.sucursal_id, _cfg.direccion, _slot.fecha, _slot.hora_inicio, _slot.hora_fin, 'confirmada', now())
  RETURNING id INTO _entrevista_id;

  UPDATE public.entrevistas_slots SET entrevista_id = _entrevista_id WHERE id = _slot.id;

  UPDATE public.entrevistas_invitaciones
  SET entrevista_id = _entrevista_id, booked_at = now(), estado = 'reservada'
  WHERE id = _inv.id;

  UPDATE public.candidatos SET estado = 'entrevista_confirmada' WHERE id = _inv.candidato_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fecha', _slot.fecha,
    'hora_inicio', _slot.hora_inicio,
    'hora_fin', _slot.hora_fin,
    'direccion', COALESCE(_cfg.direccion, '')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_reservar(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_reservar(text, uuid) TO anon, authenticated, service_role;

-- LIBERAR SLOT (RRHH)
CREATE OR REPLACE FUNCTION public.entrevista_liberar_slot(_entrevista_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot_id uuid;
BEGIN
  IF NOT public.is_admin_rrhh() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT slot_id INTO _slot_id FROM public.entrevistas WHERE id = _entrevista_id;

  UPDATE public.entrevistas SET estado = 'cancelada', slot_id = NULL WHERE id = _entrevista_id;

  IF _slot_id IS NOT NULL THEN
    UPDATE public.entrevistas_slots SET estado = 'disponible', entrevista_id = NULL WHERE id = _slot_id;
  END IF;

  UPDATE public.entrevistas_invitaciones
  SET entrevista_id = NULL, booked_at = NULL, estado = 'pendiente'
  WHERE entrevista_id = _entrevista_id;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.entrevista_liberar_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrevista_liberar_slot(uuid) TO authenticated, service_role;

-- GENERADOR DE TOKEN
CREATE OR REPLACE FUNCTION public.entrevista_generar_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT replace(md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text || clock_timestamp()::text), '-', '');
$$;
GRANT EXECUTE ON FUNCTION public.entrevista_generar_token() TO authenticated, service_role;