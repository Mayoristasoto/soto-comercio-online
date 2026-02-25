
-- =============================================
-- ITERACIÓN 2: Tablas financieras
-- =============================================

-- Parametros de cargas sociales (alícuotas parametrizables)
CREATE TABLE IF NOT EXISTS parametros_cargas_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  tipo_regimen TEXT NOT NULL DEFAULT 'general',
  alicuota_jubilacion NUMERIC(6,4) DEFAULT 0,
  alicuota_obra_social NUMERIC(6,4) DEFAULT 0,
  alicuota_ley19032 NUMERIC(6,4) DEFAULT 0,
  alicuota_art NUMERIC(6,4) DEFAULT 0,
  otras_alicuotas JSONB DEFAULT '{}',
  tope_base NUMERIC(12,2),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cargas sociales calculadas por empleado/periodo
CREATE TABLE IF NOT EXISTS cargas_sociales_calculadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  periodo_id TEXT NOT NULL REFERENCES periodos_contables(id),
  base_calculo NUMERIC(12,2) NOT NULL,
  total_cargas NUMERIC(12,2) NOT NULL,
  detalle_por_concepto JSONB DEFAULT '{}',
  parametro_id UUID REFERENCES parametros_cargas_sociales(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empleado_id, periodo_id)
);

-- Partes de horas
CREATE TABLE IF NOT EXISTS partes_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  fecha DATE NOT NULL,
  horas_normales NUMERIC(5,2) DEFAULT 0,
  horas_extra NUMERIC(5,2) DEFAULT 0,
  ausencias NUMERIC(5,2) DEFAULT 0,
  observaciones TEXT,
  periodo_id TEXT REFERENCES periodos_contables(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gastos por sucursal
CREATE TABLE IF NOT EXISTS gastos_sucursal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  periodo_id TEXT NOT NULL REFERENCES periodos_contables(id),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  centro_costo_id UUID REFERENCES centros_costo(id),
  categoria TEXT NOT NULL,
  proveedor TEXT,
  descripcion TEXT,
  monto_neto NUMERIC(12,2) NOT NULL,
  impuestos NUMERIC(12,2) DEFAULT 0,
  monto_total NUMERIC(12,2) NOT NULL,
  comprobante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prorrateo de gastos (distribución entre sucursales)
CREATE TABLE IF NOT EXISTS prorrateo_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id UUID NOT NULL REFERENCES gastos_sucursal(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  porcentaje NUMERIC(5,2) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Facturación por sucursal
CREATE TABLE IF NOT EXISTS facturacion_sucursal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  periodo_id TEXT NOT NULL REFERENCES periodos_contables(id),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  canal TEXT DEFAULT 'mostrador',
  monto_neto NUMERIC(12,2) NOT NULL,
  iva NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  cantidad_tickets INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Importación F931
CREATE TABLE IF NOT EXISTS importacion_f931 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id TEXT NOT NULL REFERENCES periodos_contables(id),
  cuil TEXT NOT NULL,
  empleado_id UUID REFERENCES empleados(id),
  datos_importados JSONB NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  diferencias JSONB,
  validado BOOLEAN DEFAULT false,
  errores TEXT[],
  archivo_origen TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots de cierre de periodo
CREATE TABLE IF NOT EXISTS snapshots_periodo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id TEXT NOT NULL REFERENCES periodos_contables(id),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  total_sueldos NUMERIC(12,2),
  total_cargas_sociales NUMERIC(12,2),
  total_costo_laboral NUMERIC(12,2),
  total_gastos NUMERIC(12,2),
  costo_operativo_total NUMERIC(12,2),
  facturacion_total NUMERIC(12,2),
  resultado_operativo NUMERIC(12,2),
  margen_operativo NUMERIC(6,2),
  datos_completos JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(periodo_id, sucursal_id)
);

-- =============================================
-- RLS para todas las tablas financieras
-- =============================================

ALTER TABLE parametros_cargas_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas_sociales_calculadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partes_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_sucursal ENABLE ROW LEVEL SECURITY;
ALTER TABLE prorrateo_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturacion_sucursal ENABLE ROW LEVEL SECURITY;
ALTER TABLE importacion_f931 ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots_periodo ENABLE ROW LEVEL SECURITY;

-- Admin full access policies
CREATE POLICY "Admin full access parametros_cargas_sociales" ON parametros_cargas_sociales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access cargas_sociales_calculadas" ON cargas_sociales_calculadas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access partes_horas" ON partes_horas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access gastos_sucursal" ON gastos_sucursal FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access prorrateo_gastos" ON prorrateo_gastos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access facturacion_sucursal" ON facturacion_sucursal FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access importacion_f931" ON importacion_f931 FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));
CREATE POLICY "Admin full access snapshots_periodo" ON snapshots_periodo FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_rrhh'));

-- Read access for authenticated users
CREATE POLICY "Read parametros_cargas_sociales" ON parametros_cargas_sociales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read cargas_sociales_calculadas" ON cargas_sociales_calculadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read partes_horas" ON partes_horas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read gastos_sucursal" ON gastos_sucursal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read prorrateo_gastos" ON prorrateo_gastos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read facturacion_sucursal" ON facturacion_sucursal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read importacion_f931" ON importacion_f931 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read snapshots_periodo" ON snapshots_periodo FOR SELECT TO authenticated USING (true);
