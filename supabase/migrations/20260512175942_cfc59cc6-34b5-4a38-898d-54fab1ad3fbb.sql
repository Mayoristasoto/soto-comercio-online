
CREATE TABLE public.calendarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  color text NOT NULL DEFAULT '#4b0d6d',
  icono text DEFAULT 'Calendar',
  es_publico boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendarios_owner ON public.calendarios(owner_id) WHERE activo;

CREATE TABLE public.calendario_compartidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendario_id uuid NOT NULL REFERENCES public.calendarios(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  permiso text NOT NULL DEFAULT 'view' CHECK (permiso IN ('view','edit')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(calendario_id, empleado_id)
);
CREATE INDEX idx_calcomp_emp ON public.calendario_compartidos(empleado_id);

CREATE TABLE public.calendario_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendario_id uuid NOT NULL REFERENCES public.calendarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  ubicacion text,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  todo_el_dia boolean NOT NULL DEFAULT false,
  color text,
  tipo text NOT NULL DEFAULT 'evento' CHECK (tipo IN ('evento','deadline','recordatorio','reunion')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completado','cancelado')),
  creado_por uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_caleventos_cal_fecha ON public.calendario_eventos(calendario_id, fecha_inicio, fecha_fin);

CREATE TABLE public.calendario_preferencias_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  calendario_id text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, calendario_id)
);

CREATE TRIGGER trg_cal_updated BEFORE UPDATE ON public.calendarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_calev_updated BEFORE UPDATE ON public.calendario_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_calpref_updated BEFORE UPDATE ON public.calendario_preferencias_usuario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_empleado_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.empleados WHERE user_id = auth.uid() AND activo = true LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_view_calendario(_cal uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendarios c
    WHERE c.id = _cal AND c.activo = true
      AND (
        c.es_publico = true
        OR c.owner_id = public.current_empleado_id()
        OR EXISTS (
          SELECT 1 FROM public.calendario_compartidos sc
          WHERE sc.calendario_id = _cal AND sc.empleado_id = public.current_empleado_id()
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_calendario(_cal uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendarios c
    WHERE c.id = _cal AND c.activo = true
      AND (
        c.owner_id = public.current_empleado_id()
        OR EXISTS (
          SELECT 1 FROM public.calendario_compartidos sc
          WHERE sc.calendario_id = _cal AND sc.empleado_id = public.current_empleado_id()
            AND sc.permiso = 'edit'
        )
      )
  )
$$;

ALTER TABLE public.calendarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_compartidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_preferencias_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver calendarios visibles" ON public.calendarios FOR SELECT TO authenticated
  USING (activo = true AND (
    es_publico = true
    OR owner_id = public.current_empleado_id()
    OR EXISTS (SELECT 1 FROM public.calendario_compartidos sc WHERE sc.calendario_id = id AND sc.empleado_id = public.current_empleado_id())
  ));
CREATE POLICY "crear calendario propio" ON public.calendarios FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.current_empleado_id());
CREATE POLICY "owner actualiza" ON public.calendarios FOR UPDATE TO authenticated
  USING (owner_id = public.current_empleado_id());
CREATE POLICY "owner elimina" ON public.calendarios FOR DELETE TO authenticated
  USING (owner_id = public.current_empleado_id());

CREATE POLICY "ver compartidos relacionados" ON public.calendario_compartidos FOR SELECT TO authenticated
  USING (
    empleado_id = public.current_empleado_id()
    OR EXISTS (SELECT 1 FROM public.calendarios c WHERE c.id = calendario_id AND c.owner_id = public.current_empleado_id())
  );
CREATE POLICY "owner gestiona compartidos" ON public.calendario_compartidos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendarios c WHERE c.id = calendario_id AND c.owner_id = public.current_empleado_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calendarios c WHERE c.id = calendario_id AND c.owner_id = public.current_empleado_id()));

CREATE POLICY "ver eventos calendarios visibles" ON public.calendario_eventos FOR SELECT TO authenticated
  USING (public.can_view_calendario(calendario_id));
CREATE POLICY "crear eventos con permiso edit" ON public.calendario_eventos FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_calendario(calendario_id));
CREATE POLICY "actualizar eventos con permiso edit" ON public.calendario_eventos FOR UPDATE TO authenticated
  USING (public.can_edit_calendario(calendario_id));
CREATE POLICY "borrar eventos con permiso edit" ON public.calendario_eventos FOR DELETE TO authenticated
  USING (public.can_edit_calendario(calendario_id));

CREATE POLICY "preferencias propias" ON public.calendario_preferencias_usuario FOR ALL TO authenticated
  USING (empleado_id = public.current_empleado_id())
  WITH CHECK (empleado_id = public.current_empleado_id());

CREATE OR REPLACE FUNCTION public.get_cumpleanos_rango(_desde date, _hasta date)
RETURNS TABLE(empleado_id uuid, nombre text, fecha_cumple date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  y int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_rrhh'::user_role) THEN
    RETURN;
  END IF;
  FOR y IN EXTRACT(YEAR FROM _desde)::int .. EXTRACT(YEAR FROM _hasta)::int LOOP
    RETURN QUERY
    SELECT e.id,
           (e.nombre || ' ' || COALESCE(e.apellido,''))::text,
           make_date(y, EXTRACT(MONTH FROM s.fecha_nacimiento)::int, EXTRACT(DAY FROM s.fecha_nacimiento)::int)
    FROM public.empleados e
    JOIN public.empleados_datos_sensibles s ON s.empleado_id = e.id
    WHERE e.activo = true
      AND s.fecha_nacimiento IS NOT NULL
      AND make_date(y, EXTRACT(MONTH FROM s.fecha_nacimiento)::int, EXTRACT(DAY FROM s.fecha_nacimiento)::int) BETWEEN _desde AND _hasta;
  END LOOP;
END;
$$;

INSERT INTO public.app_pages (path, nombre, descripcion, icon, tipo, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar)
VALUES ('/rrhh/calendarios','Calendarios','Calendarios compartidos con eventos, cumpleaños, vacaciones y deadlines','Calendar','link',true,true,ARRAY['admin_rrhh']::text[],true)
ON CONFLICT (path) DO NOTHING;
