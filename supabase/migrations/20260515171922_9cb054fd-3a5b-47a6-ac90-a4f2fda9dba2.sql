
CREATE TABLE public.liquidaciones_horas_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  sucursal_id UUID NULL,
  sucursal_label TEXT NOT NULL DEFAULT 'Todas',
  empleados_label TEXT NOT NULL DEFAULT 'Todos',
  estado TEXT NOT NULL DEFAULT 'aprobado_rrhh',
  config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_hs_habil NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_hs_domingo NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  cantidad_jornadas INT NOT NULL DEFAULT 0,
  cantidad_empleados INT NOT NULL DEFAULT 0,
  observaciones TEXT
);

CREATE TABLE public.liquidaciones_horas_extras_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liquidacion_id UUID NOT NULL REFERENCES public.liquidaciones_horas_extras(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL,
  empleado_nombre TEXT NOT NULL,
  sucursal_id UUID NULL,
  sucursal_nombre TEXT,
  fecha DATE NOT NULL,
  es_domingo BOOLEAN NOT NULL DEFAULT false,
  entrada TEXT,
  salida TEXT,
  base_hs NUMERIC(6,2) NOT NULL DEFAULT 0,
  exceso_real_min INT NOT NULL DEFAULT 0,
  extra_hs NUMERIC(6,2) NOT NULL DEFAULT 0,
  redondeo_label TEXT,
  valor_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liq_he_items_liq ON public.liquidaciones_horas_extras_items(liquidacion_id);
CREATE INDEX idx_liq_he_items_emp ON public.liquidaciones_horas_extras_items(empleado_id, fecha);
CREATE INDEX idx_liq_he_periodo ON public.liquidaciones_horas_extras(fecha_desde, fecha_hasta);

ALTER TABLE public.liquidaciones_horas_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones_horas_extras_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AdminRRHH ven liquidaciones HE"
  ON public.liquidaciones_horas_extras FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "AdminRRHH crean liquidaciones HE"
  ON public.liquidaciones_horas_extras FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "AdminRRHH actualizan liquidaciones HE"
  ON public.liquidaciones_horas_extras FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "AdminRRHH ven items HE"
  ON public.liquidaciones_horas_extras_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE POLICY "AdminRRHH crean items HE"
  ON public.liquidaciones_horas_extras_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));
