ALTER TABLE public.fichado_ubicaciones
  ADD COLUMN IF NOT EXISTS centro_costo_id uuid REFERENCES public.centros_costo(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.distancia_metros(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 6371000 * 2 * asin(
    sqrt(
      power(sin(radians((lat2 - lat1)::double precision) / 2), 2) +
      cos(radians(lat1::double precision)) * cos(radians(lat2::double precision)) *
      power(sin(radians((lon2 - lon1)::double precision) / 2), 2)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_fichajes_ubicaciones(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_empleados uuid[] DEFAULT NULL
)
RETURNS TABLE (
  fichaje_id uuid,
  empleado_id uuid,
  empleado_nombre text,
  empleado_apellido text,
  sucursal_id uuid,
  sucursal_nombre text,
  tipo text,
  metodo text,
  timestamp_real timestamptz,
  latitud numeric,
  longitud numeric,
  punto_id uuid,
  punto_nombre text,
  punto_radio integer,
  distancia_metros double precision,
  dentro_radio boolean,
  centro_costo_id uuid,
  centro_costo_nombre text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_or_manager() OR public.has_role(auth.uid(), 'admin_rrhh')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.empleado_id,
    e.nombre,
    e.apellido,
    e.sucursal_id,
    s.nombre,
    f.tipo::text,
    f.metodo::text,
    f.timestamp_real,
    f.latitud,
    f.longitud,
    p.id,
    p.nombre,
    p.radio_metros,
    p.dist,
    (p.dist IS NOT NULL AND p.dist <= COALESCE(p.radio_metros, 150)),
    p.centro_costo_id,
    cc.nombre
  FROM public.fichajes f
  JOIN public.empleados e ON e.id = f.empleado_id
  LEFT JOIN public.sucursales s ON s.id = e.sucursal_id
  LEFT JOIN LATERAL (
    SELECT u.id, u.nombre, u.radio_metros, u.centro_costo_id,
           public.distancia_metros(f.latitud, f.longitud, u.latitud, u.longitud) AS dist
    FROM public.fichado_ubicaciones u
    WHERE u.activa = true
      AND f.latitud IS NOT NULL AND f.longitud IS NOT NULL
    ORDER BY public.distancia_metros(f.latitud, f.longitud, u.latitud, u.longitud) ASC
    LIMIT 1
  ) p ON true
  LEFT JOIN public.centros_costo cc ON cc.id = p.centro_costo_id
  WHERE f.timestamp_real >= p_desde
    AND f.timestamp_real <= p_hasta
    AND (p_empleados IS NULL OR f.empleado_id = ANY(p_empleados))
  ORDER BY f.timestamp_real DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_fichajes_ubicaciones(timestamptz, timestamptz, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fichajes_ubicaciones(timestamptz, timestamptz, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distancia_metros(numeric, numeric, numeric, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_clusters_fichajes_gps(
  p_desde timestamptz,
  p_hasta timestamptz
)
RETURNS TABLE (
  lat numeric,
  lon numeric,
  cantidad bigint,
  punto_nombre text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin_or_manager() OR public.has_role(auth.uid(), 'admin_rrhh')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH g AS (
    SELECT round(f.latitud, 3) AS lat, round(f.longitud, 3) AS lon, count(*) AS cantidad
    FROM public.fichajes f
    WHERE f.latitud IS NOT NULL
      AND f.timestamp_real >= p_desde
      AND f.timestamp_real <= p_hasta
    GROUP BY 1, 2
  )
  SELECT g.lat, g.lon, g.cantidad,
    (SELECT u.nombre FROM public.fichado_ubicaciones u
     WHERE u.activa = true
       AND public.distancia_metros(g.lat, g.lon, u.latitud, u.longitud) <= COALESCE(u.radio_metros, 150)
     ORDER BY public.distancia_metros(g.lat, g.lon, u.latitud, u.longitud) LIMIT 1)
  FROM g
  ORDER BY g.cantidad DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_clusters_fichajes_gps(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_clusters_fichajes_gps(timestamptz, timestamptz) TO authenticated;

GRANT SELECT ON public.fichado_ubicaciones TO authenticated;
GRANT ALL ON public.fichado_ubicaciones TO service_role;
GRANT SELECT ON public.centros_costo TO authenticated;
GRANT ALL ON public.centros_costo TO service_role;

DROP POLICY IF EXISTS "Authenticated can view fichado_ubicaciones" ON public.fichado_ubicaciones;
CREATE POLICY "Authenticated can view fichado_ubicaciones"
ON public.fichado_ubicaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage fichado_ubicaciones" ON public.fichado_ubicaciones;
CREATE POLICY "Admins manage fichado_ubicaciones"
ON public.fichado_ubicaciones FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

DROP POLICY IF EXISTS "Admins manage centros_costo" ON public.centros_costo;
CREATE POLICY "Admins manage centros_costo"
ON public.centros_costo FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));