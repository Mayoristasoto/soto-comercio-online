
-- Tabla de asignaciones de limpieza por día de la semana
CREATE TABLE public.limpieza_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  zona text NOT NULL DEFAULT 'General',
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE CASCADE,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dia_semana, empleado_id, zona)
);

ALTER TABLE public.limpieza_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read limpieza_asignaciones"
  ON public.limpieza_asignaciones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage limpieza_asignaciones"
  ON public.limpieza_asignaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabla de registros de cumplimiento de limpieza
CREATE TABLE public.limpieza_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asignacion_id uuid REFERENCES public.limpieza_asignaciones(id),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  completada boolean NOT NULL DEFAULT false,
  registrado_en timestamptz DEFAULT now(),
  dispositivo text DEFAULT 'kiosco',
  UNIQUE(empleado_id, fecha, asignacion_id)
);

ALTER TABLE public.limpieza_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read limpieza_registros"
  ON public.limpieza_registros FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert limpieza_registros"
  ON public.limpieza_registros FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anon to insert limpieza_registros (kiosk flow)
CREATE POLICY "Anon can insert limpieza_registros"
  ON public.limpieza_registros FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to read limpieza_asignaciones (kiosk flow)
CREATE POLICY "Anon can read limpieza_asignaciones"
  ON public.limpieza_asignaciones FOR SELECT TO anon USING (true);

-- RPC para kiosco: obtener asignaciones de limpieza del día actual
CREATE OR REPLACE FUNCTION public.kiosk_get_limpieza_hoy(p_empleado_id uuid)
RETURNS TABLE(id uuid, zona text, dia_semana int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT la.id, la.zona, la.dia_semana
  FROM limpieza_asignaciones la
  WHERE la.empleado_id = p_empleado_id
    AND la.dia_semana = EXTRACT(DOW FROM CURRENT_DATE)::int
    AND la.activo = true;
$$;

-- RPC para kiosco: registrar cumplimiento de limpieza
CREATE OR REPLACE FUNCTION public.kiosk_registrar_limpieza(
  p_asignacion_id uuid,
  p_empleado_id uuid,
  p_completada boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO limpieza_registros (asignacion_id, empleado_id, fecha, completada, dispositivo)
  VALUES (p_asignacion_id, p_empleado_id, CURRENT_DATE, p_completada, 'kiosco')
  ON CONFLICT (empleado_id, fecha, asignacion_id)
  DO UPDATE SET completada = p_completada, registrado_en = now();
END;
$$;
