
-- 1) Tabla de listas guardadas por usuario
CREATE TABLE IF NOT EXISTS public.liquidacion_listas_empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  empleado_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidacion_listas_empleados TO authenticated;
GRANT ALL ON public.liquidacion_listas_empleados TO service_role;

ALTER TABLE public.liquidacion_listas_empleados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners select" ON public.liquidacion_listas_empleados
  FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "owners insert" ON public.liquidacion_listas_empleados
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners update" ON public.liquidacion_listas_empleados
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "owners delete" ON public.liquidacion_listas_empleados
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TRIGGER set_liquidacion_listas_empleados_updated_at
  BEFORE UPDATE ON public.liquidacion_listas_empleados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) RPC: empleados que ficharon en días feriados
CREATE OR REPLACE FUNCTION public.get_feriados_trabajados(
  p_desde date,
  p_hasta date,
  p_sucursales uuid[] DEFAULT NULL,
  p_empleados uuid[] DEFAULT NULL
)
RETURNS TABLE (
  empleado_id uuid,
  empleado_nombre text,
  empleado_apellido text,
  empleado_legajo text,
  sucursal_id uuid,
  sucursal_nombre text,
  fecha date,
  feriado_nombre text,
  hora_entrada time,
  hora_salida time,
  horas_trabajadas numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fichajes_dia AS (
    SELECT
      f.empleado_id,
      (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS fecha,
      MIN(CASE WHEN f.tipo = 'entrada' THEN (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time END) AS hora_in,
      MAX(CASE WHEN f.tipo = 'salida'  THEN (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::time END) AS hora_out
    FROM public.fichajes f
    WHERE (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date BETWEEN p_desde AND p_hasta
    GROUP BY f.empleado_id, (f.timestamp_real AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
  )
  SELECT
    e.id,
    e.nombre,
    e.apellido,
    e.legajo,
    e.sucursal_id,
    s.nombre,
    fd.fecha,
    df.nombre,
    fd.hora_in,
    fd.hora_out,
    CASE
      WHEN fd.hora_in IS NOT NULL AND fd.hora_out IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (fd.hora_out - fd.hora_in))::numeric / 3600.0, 2)
      ELSE 0
    END
  FROM fichajes_dia fd
  JOIN public.dias_feriados df ON df.fecha = fd.fecha AND df.activo = true
  JOIN public.empleados e ON e.id = fd.empleado_id
  LEFT JOIN public.sucursales s ON s.id = e.sucursal_id
  WHERE (p_sucursales IS NULL OR e.sucursal_id = ANY(p_sucursales))
    AND (p_empleados  IS NULL OR e.id          = ANY(p_empleados))
  ORDER BY fd.fecha, e.apellido, e.nombre;
$$;

GRANT EXECUTE ON FUNCTION public.get_feriados_trabajados(date, date, uuid[], uuid[]) TO authenticated, service_role;

-- 3) Precarga feriados nacionales Argentina 2024, 2025 y 2027
INSERT INTO public.dias_feriados (fecha, nombre, activo) VALUES
  -- 2024
  ('2024-01-01','Año Nuevo', true),
  ('2024-02-12','Carnaval', true),
  ('2024-02-13','Carnaval', true),
  ('2024-03-24','Día Nacional de la Memoria por la Verdad y la Justicia', true),
  ('2024-03-29','Viernes Santo', true),
  ('2024-04-02','Día del Veterano y de los Caídos en la Guerra de Malvinas', true),
  ('2024-05-01','Día del Trabajador', true),
  ('2024-05-25','Día de la Revolución de Mayo', true),
  ('2024-06-17','Paso a la Inmortalidad del Gral. Güemes', true),
  ('2024-06-20','Paso a la Inmortalidad del Gral. Belgrano', true),
  ('2024-07-09','Día de la Independencia', true),
  ('2024-08-19','Paso a la Inmortalidad del Gral. San Martín', true),
  ('2024-10-14','Día del Respeto a la Diversidad Cultural', true),
  ('2024-11-18','Día de la Soberanía Nacional', true),
  ('2024-12-08','Inmaculada Concepción de María', true),
  ('2024-12-25','Navidad', true),
  -- 2025
  ('2025-01-01','Año Nuevo', true),
  ('2025-03-03','Carnaval', true),
  ('2025-03-04','Carnaval', true),
  ('2025-03-24','Día Nacional de la Memoria por la Verdad y la Justicia', true),
  ('2025-04-02','Día del Veterano y de los Caídos en la Guerra de Malvinas', true),
  ('2025-04-18','Viernes Santo', true),
  ('2025-05-01','Día del Trabajador', true),
  ('2025-05-25','Día de la Revolución de Mayo', true),
  ('2025-06-16','Paso a la Inmortalidad del Gral. Güemes', true),
  ('2025-06-20','Paso a la Inmortalidad del Gral. Belgrano', true),
  ('2025-07-09','Día de la Independencia', true),
  ('2025-08-18','Paso a la Inmortalidad del Gral. San Martín', true),
  ('2025-10-13','Día del Respeto a la Diversidad Cultural', true),
  ('2025-11-24','Día de la Soberanía Nacional', true),
  ('2025-12-08','Inmaculada Concepción de María', true),
  ('2025-12-25','Navidad', true),
  -- 2027
  ('2027-01-01','Año Nuevo', true),
  ('2027-02-08','Carnaval', true),
  ('2027-02-09','Carnaval', true),
  ('2027-03-24','Día Nacional de la Memoria por la Verdad y la Justicia', true),
  ('2027-03-26','Viernes Santo', true),
  ('2027-04-02','Día del Veterano y de los Caídos en la Guerra de Malvinas', true),
  ('2027-05-01','Día del Trabajador', true),
  ('2027-05-25','Día de la Revolución de Mayo', true),
  ('2027-06-18','Paso a la Inmortalidad del Gral. Güemes', true),
  ('2027-06-20','Paso a la Inmortalidad del Gral. Belgrano', true),
  ('2027-07-09','Día de la Independencia', true),
  ('2027-08-16','Paso a la Inmortalidad del Gral. San Martín', true),
  ('2027-10-11','Día del Respeto a la Diversidad Cultural', true),
  ('2027-11-22','Día de la Soberanía Nacional', true),
  ('2027-12-08','Inmaculada Concepción de María', true),
  ('2027-12-25','Navidad', true)
ON CONFLICT DO NOTHING;
