INSERT INTO public.centros_costo (nombre, tipo, activo)
SELECT 'Administración', 'administrativo', true
WHERE NOT EXISTS (SELECT 1 FROM public.centros_costo WHERE nombre = 'Administración');

CREATE TABLE public.distribucion_costos_empleado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  centro_costo_id uuid NOT NULL REFERENCES public.centros_costo(id) ON DELETE CASCADE,
  horas numeric NOT NULL DEFAULT 0,
  porcentaje numeric NOT NULL DEFAULT 0,
  origen text NOT NULL DEFAULT 'fichadas',
  confirmado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periodo, empleado_id, centro_costo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribucion_costos_empleado TO authenticated;
GRANT ALL ON public.distribucion_costos_empleado TO service_role;
ALTER TABLE public.distribucion_costos_empleado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin RRHH gestiona distribucion" ON public.distribucion_costos_empleado FOR ALL TO authenticated
USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_distrib_updated BEFORE UPDATE ON public.distribucion_costos_empleado FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.empleado_centro_costo_fijo (
  empleado_id uuid PRIMARY KEY REFERENCES public.empleados(id) ON DELETE CASCADE,
  centro_costo_id uuid NOT NULL REFERENCES public.centros_costo(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empleado_centro_costo_fijo TO authenticated;
GRANT ALL ON public.empleado_centro_costo_fijo TO service_role;
ALTER TABLE public.empleado_centro_costo_fijo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin RRHH gestiona centro fijo" ON public.empleado_centro_costo_fijo FOR ALL TO authenticated
USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.calcular_distribucion_costos(p_desde date, p_hasta date)
RETURNS TABLE(empleado_id uuid, centro_costo_id uuid, horas numeric, tramos integer, tramos_sin_ubicacion integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
  WITH f AS (
    SELECT fi.empleado_id, fi.tipo::text tipo, fi.timestamp_real ts, fi.latitud, fi.longitud,
      lead(fi.tipo::text) OVER w next_tipo, lead(fi.timestamp_real) OVER w next_ts
    FROM fichajes fi
    WHERE fi.timestamp_real >= (p_desde::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
      AND fi.timestamp_real < ((p_hasta + 1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
      AND fi.estado::text <> 'rechazado'
    WINDOW w AS (PARTITION BY fi.empleado_id ORDER BY fi.timestamp_real)
  ), tramos AS (
    SELECT f.empleado_id, f.latitud, f.longitud,
      EXTRACT(EPOCH FROM (f.next_ts - f.ts))/3600.0 h
    FROM f
    WHERE f.tipo IN ('entrada','pausa_fin') AND f.next_tipo IN ('salida','pausa_inicio')
      AND f.next_ts - f.ts < interval '16 hours'
  ), clas AS (
    SELECT t.empleado_id, t.h,
      (SELECT u.centro_costo_id FROM fichado_ubicaciones u
        WHERE u.activa AND u.centro_costo_id IS NOT NULL AND u.latitud <> 0 AND t.latitud IS NOT NULL
          AND public.distancia_metros(t.latitud, t.longitud, u.latitud, u.longitud) <= u.radio_metros
        ORDER BY public.distancia_metros(t.latitud, t.longitud, u.latitud, u.longitud) LIMIT 1) cc
    FROM tramos t
  )
  SELECT c.empleado_id, c.cc, round(sum(c.h)::numeric, 2), count(*)::int,
    count(*) FILTER (WHERE c.cc IS NULL)::int
  FROM clas c GROUP BY c.empleado_id, c.cc;
END $$;
GRANT EXECUTE ON FUNCTION public.calcular_distribucion_costos(date, date) TO authenticated;