
ALTER TABLE public.calendarios
  ADD COLUMN IF NOT EXISTS tipo_sistema text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS sucursal_id uuid;

ALTER TABLE public.calendario_eventos
  ADD COLUMN IF NOT EXISTS notificar_kiosco boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_calendarios_tipo_sucursal
  ON public.calendarios(tipo_sistema, sucursal_id);

CREATE TABLE IF NOT EXISTS public.calendario_empleados_afectados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendario_id uuid NOT NULL REFERENCES public.calendarios(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(calendario_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_calendario_afectados_calendario
  ON public.calendario_empleados_afectados(calendario_id);
CREATE INDEX IF NOT EXISTS idx_calendario_afectados_empleado
  ON public.calendario_empleados_afectados(empleado_id);

CREATE TABLE IF NOT EXISTS public.calendario_evento_empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.calendario_eventos(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  notificado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evento_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_calendario_evento_empleados_evento
  ON public.calendario_evento_empleados(evento_id);
CREATE INDEX IF NOT EXISTS idx_calendario_evento_empleados_empleado
  ON public.calendario_evento_empleados(empleado_id);

CREATE TABLE IF NOT EXISTS public.calendario_notificaciones_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('calendario', 'evento')),
  target_id uuid NOT NULL,
  notif_in_app boolean NOT NULL DEFAULT true,
  notif_kiosco boolean NOT NULL DEFAULT false,
  notificar_rrhh boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, target_id)
);

CREATE TRIGGER update_calendario_notificaciones_config_updated_at
BEFORE UPDATE ON public.calendario_notificaciones_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.calendario_empleados_afectados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_evento_empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_notificaciones_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_rrhh()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin_rrhh'::public.user_role)
$$;

CREATE OR REPLACE FUNCTION public.is_gerente_de_sucursal(_sucursal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empleados e
    WHERE e.user_id = auth.uid()
      AND e.sucursal_id = _sucursal_id
      AND public.has_role(auth.uid(), 'gerente_sucursal'::public.user_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_calendario_afectados(_calendario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendarios c
    WHERE c.id = _calendario_id
      AND (
        c.owner_id = public.current_empleado_id()
        OR public.is_admin_rrhh()
        OR (c.tipo_sistema = 'novedades_sucursal' AND public.is_gerente_de_sucursal(c.sucursal_id))
      )
  )
$$;

DROP POLICY IF EXISTS "ver afectados de calendario" ON public.calendario_empleados_afectados;
CREATE POLICY "ver afectados de calendario"
ON public.calendario_empleados_afectados
FOR SELECT
TO authenticated
USING (
  empleado_id = public.current_empleado_id()
  OR public.can_manage_calendario_afectados(calendario_id)
);

DROP POLICY IF EXISTS "crear afectados de calendario" ON public.calendario_empleados_afectados;
CREATE POLICY "crear afectados de calendario"
ON public.calendario_empleados_afectados
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_calendario_afectados(calendario_id));

DROP POLICY IF EXISTS "eliminar afectados de calendario" ON public.calendario_empleados_afectados;
CREATE POLICY "eliminar afectados de calendario"
ON public.calendario_empleados_afectados
FOR DELETE
TO authenticated
USING (public.can_manage_calendario_afectados(calendario_id));

DROP POLICY IF EXISTS "ver afectados de evento" ON public.calendario_evento_empleados;
CREATE POLICY "ver afectados de evento"
ON public.calendario_evento_empleados
FOR SELECT
TO authenticated
USING (
  empleado_id = public.current_empleado_id()
  OR EXISTS (
    SELECT 1
    FROM public.calendario_eventos ev
    WHERE ev.id = evento_id
      AND public.can_manage_calendario_afectados(ev.calendario_id)
  )
);

DROP POLICY IF EXISTS "crear afectados de evento" ON public.calendario_evento_empleados;
CREATE POLICY "crear afectados de evento"
ON public.calendario_evento_empleados
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.calendario_eventos ev
    WHERE ev.id = evento_id
      AND public.can_manage_calendario_afectados(ev.calendario_id)
  )
);

DROP POLICY IF EXISTS "eliminar afectados de evento" ON public.calendario_evento_empleados;
CREATE POLICY "eliminar afectados de evento"
ON public.calendario_evento_empleados
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.calendario_eventos ev
    WHERE ev.id = evento_id
      AND public.can_manage_calendario_afectados(ev.calendario_id)
  )
);

DROP POLICY IF EXISTS "ver config notificaciones calendario" ON public.calendario_notificaciones_config;
CREATE POLICY "ver config notificaciones calendario"
ON public.calendario_notificaciones_config
FOR SELECT
TO authenticated
USING (
  public.is_admin_rrhh()
  OR (scope = 'calendario' AND public.can_manage_calendario_afectados(target_id))
  OR (scope = 'evento' AND EXISTS (
    SELECT 1 FROM public.calendario_eventos ev
    WHERE ev.id = target_id AND public.can_manage_calendario_afectados(ev.calendario_id)
  ))
);

DROP POLICY IF EXISTS "crear config notificaciones calendario" ON public.calendario_notificaciones_config;
CREATE POLICY "crear config notificaciones calendario"
ON public.calendario_notificaciones_config
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_rrhh()
  OR (scope = 'calendario' AND public.can_manage_calendario_afectados(target_id))
  OR (scope = 'evento' AND EXISTS (
    SELECT 1 FROM public.calendario_eventos ev
    WHERE ev.id = target_id AND public.can_manage_calendario_afectados(ev.calendario_id)
  ))
);

DROP POLICY IF EXISTS "actualizar config notificaciones calendario" ON public.calendario_notificaciones_config;
CREATE POLICY "actualizar config notificaciones calendario"
ON public.calendario_notificaciones_config
FOR UPDATE
TO authenticated
USING (
  public.is_admin_rrhh()
  OR (scope = 'calendario' AND public.can_manage_calendario_afectados(target_id))
  OR (scope = 'evento' AND EXISTS (
    SELECT 1 FROM public.calendario_eventos ev
    WHERE ev.id = target_id AND public.can_manage_calendario_afectados(ev.calendario_id)
  ))
)
WITH CHECK (
  public.is_admin_rrhh()
  OR (scope = 'calendario' AND public.can_manage_calendario_afectados(target_id))
  OR (scope = 'evento' AND EXISTS (
    SELECT 1 FROM public.calendario_eventos ev
    WHERE ev.id = target_id AND public.can_manage_calendario_afectados(ev.calendario_id)
  ))
);

CREATE OR REPLACE FUNCTION public.notificar_evento_calendario_a_empleado(_evento_id uuid, _empleado_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ev record;
  _uid uuid;
  _in_app boolean;
BEGIN
  SELECT ev.id, ev.calendario_id, ev.titulo, ev.descripcion, ev.fecha_inicio, c.nombre AS calendario_nombre
  INTO _ev
  FROM public.calendario_eventos ev
  JOIN public.calendarios c ON c.id = ev.calendario_id
  WHERE ev.id = _evento_id;

  IF _ev.id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(cfg.notif_in_app, true)
  INTO _in_app
  FROM public.calendario_notificaciones_config cfg
  WHERE cfg.scope = 'calendario' AND cfg.target_id = _ev.calendario_id;

  IF COALESCE(_in_app, true) IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT user_id INTO _uid FROM public.empleados WHERE id = _empleado_id AND activo = true;

  IF _uid IS NOT NULL THEN
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, metadata)
    VALUES (
      _uid,
      'Nueva novedad: ' || COALESCE(_ev.titulo, 'Evento'),
      COALESCE(_ev.descripcion, _ev.calendario_nombre, '') || ' - ' || to_char(_ev.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
      'evento_calendario',
      jsonb_build_object('evento_id', _ev.id, 'calendario_id', _ev.calendario_id)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notificar_evento_calendario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _emp record;
  _notificar_rrhh boolean;
  _uid uuid;
BEGIN
  FOR _emp IN
    SELECT empleado_id
    FROM public.calendario_empleados_afectados
    WHERE calendario_id = NEW.calendario_id
  LOOP
    PERFORM public.notificar_evento_calendario_a_empleado(NEW.id, _emp.empleado_id);
  END LOOP;

  SELECT COALESCE(cfg.notificar_rrhh, false)
  INTO _notificar_rrhh
  FROM public.calendario_notificaciones_config cfg
  WHERE cfg.scope = 'calendario' AND cfg.target_id = NEW.calendario_id;

  IF COALESCE(_notificar_rrhh, false) THEN
    FOR _uid IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin_rrhh'::public.user_role
    LOOP
      INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, metadata)
      VALUES (
        _uid,
        'Novedad de sucursal: ' || COALESCE(NEW.titulo, 'Evento'),
        COALESCE(NEW.descripcion, '') || ' - ' || to_char(NEW.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI'),
        'novedad_sucursal',
        jsonb_build_object('evento_id', NEW.id, 'calendario_id', NEW.calendario_id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_evento_calendario ON public.calendario_eventos;
CREATE TRIGGER trg_notificar_evento_calendario
AFTER INSERT ON public.calendario_eventos
FOR EACH ROW EXECUTE FUNCTION public.trg_notificar_evento_calendario();

CREATE OR REPLACE FUNCTION public.trg_notificar_empleado_agregado_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notificar_evento_calendario_a_empleado(NEW.evento_id, NEW.empleado_id);
  UPDATE public.calendario_evento_empleados
  SET notificado_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_empleado_agregado_evento ON public.calendario_evento_empleados;
CREATE TRIGGER trg_notificar_empleado_agregado_evento
AFTER INSERT ON public.calendario_evento_empleados
FOR EACH ROW EXECUTE FUNCTION public.trg_notificar_empleado_agregado_evento();
