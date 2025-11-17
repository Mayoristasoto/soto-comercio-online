-- =====================================================
-- FASE 1: MÓDULO DE PAYROLL - ESTRUCTURA DE BASE DE DATOS
-- (Versión segura con verificaciones)
-- =====================================================

-- 1. ENUMS (con verificación de existencia)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE liquidacion_estado AS ENUM (
    'borrador', 'calculada', 'aprobada', 'pagada', 'cerrada'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE concepto_tipo AS ENUM (
    'remunerativo', 'no_remunerativo', 'deduccion'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE concepto_categoria AS ENUM (
    'haberes', 'descuentos', 'contribuciones'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE recibo_concepto_tipo AS ENUM (
    'haber', 'descuento', 'contribucion'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE forma_pago AS ENUM (
    'transferencia', 'efectivo', 'cheque'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLAS PRINCIPALES
-- =====================================================

-- A) CONVENIOS COLECTIVOS
CREATE TABLE IF NOT EXISTS public.convenios_colectivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  horas_mensuales INTEGER NOT NULL DEFAULT 200,
  valor_hora_base NUMERIC(12,2),
  porcentaje_he_50 NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  porcentaje_he_100 NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  activo BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B) CONCEPTOS DE LIQUIDACIÓN
CREATE TABLE IF NOT EXISTS public.conceptos_liquidacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo concepto_tipo NOT NULL,
  categoria concepto_categoria NOT NULL,
  formula TEXT,
  requiere_cantidad BOOLEAN NOT NULL DEFAULT false,
  convenio_id UUID REFERENCES public.convenios_colectivos(id) ON DELETE SET NULL,
  orden_impresion INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  aplica_a_roles TEXT[] DEFAULT ARRAY['empleado']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C) LIQUIDACIONES MENSUALES
CREATE TABLE IF NOT EXISTS public.liquidaciones_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  fecha_liquidacion DATE NOT NULL,
  fecha_pago DATE,
  estado liquidacion_estado NOT NULL DEFAULT 'borrador',
  liquidada_por UUID REFERENCES public.empleados(id),
  aprobada_por UUID REFERENCES public.empleados(id),
  observaciones TEXT,
  total_remunerativo NUMERIC(15,2) DEFAULT 0,
  total_no_remunerativo NUMERIC(15,2) DEFAULT 0,
  total_deducciones NUMERIC(15,2) DEFAULT 0,
  total_neto NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(periodo)
);

-- D) RECIBOS DE SUELDO
CREATE TABLE IF NOT EXISTS public.recibos_sueldo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id UUID NOT NULL REFERENCES public.liquidaciones_mensuales(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  legajo TEXT,
  fecha_ingreso DATE,
  cuil TEXT,
  categoria TEXT,
  sueldo_basico NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_remunerativo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_no_remunerativo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_haberes NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_descuentos NUMERIC(12,2) NOT NULL DEFAULT 0,
  neto_a_pagar NUMERIC(12,2) NOT NULL DEFAULT 0,
  dias_trabajados INTEGER DEFAULT 0,
  horas_trabajadas NUMERIC(8,2) DEFAULT 0,
  horas_extras_50 NUMERIC(8,2) DEFAULT 0,
  horas_extras_100 NUMERIC(8,2) DEFAULT 0,
  ausencias_justificadas INTEGER DEFAULT 0,
  ausencias_injustificadas INTEGER DEFAULT 0,
  llegadas_tarde INTEGER DEFAULT 0,
  pdf_url TEXT,
  firmado BOOLEAN DEFAULT false,
  fecha_firma TIMESTAMPTZ,
  datos_completos JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(liquidacion_id, empleado_id)
);

-- E) CONCEPTOS EN RECIBOS
CREATE TABLE IF NOT EXISTS public.recibo_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id UUID NOT NULL REFERENCES public.recibos_sueldo(id) ON DELETE CASCADE,
  concepto_id UUID REFERENCES public.conceptos_liquidacion(id) ON DELETE SET NULL,
  codigo_concepto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2),
  unitario NUMERIC(12,2),
  subtotal NUMERIC(12,2) NOT NULL,
  tipo recibo_concepto_tipo NOT NULL,
  es_remunerativo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F) REGISTRO DE HORAS TRABAJADAS
CREATE TABLE IF NOT EXISTS public.horas_trabajadas_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  periodo TEXT NOT NULL,
  turno_id UUID REFERENCES public.fichado_turnos(id) ON DELETE SET NULL,
  hora_entrada_teorica TIME,
  hora_salida_teorica TIME,
  hora_entrada_real TIMESTAMPTZ,
  hora_salida_real TIMESTAMPTZ,
  horas_teoricas NUMERIC(5,2) DEFAULT 0,
  horas_trabajadas NUMERIC(5,2) DEFAULT 0,
  horas_extras_50 NUMERIC(5,2) DEFAULT 0,
  horas_extras_100 NUMERIC(5,2) DEFAULT 0,
  minutos_pausa INTEGER DEFAULT 0,
  minutos_tarde INTEGER DEFAULT 0,
  es_feriado BOOLEAN DEFAULT false,
  es_domingo BOOLEAN DEFAULT false,
  ausente BOOLEAN DEFAULT false,
  justificado BOOLEAN DEFAULT false,
  tipo_ausencia TEXT,
  fichaje_entrada_id UUID REFERENCES public.fichajes(id),
  fichaje_salida_id UUID REFERENCES public.fichajes(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, fecha)
);

-- G) CONFIGURACIÓN DE PAYROLL POR EMPLEADO
CREATE TABLE IF NOT EXISTS public.empleados_configuracion_payroll (
  empleado_id UUID PRIMARY KEY REFERENCES public.empleados(id) ON DELETE CASCADE,
  convenio_id UUID REFERENCES public.convenios_colectivos(id) ON DELETE SET NULL,
  categoria TEXT,
  obra_social_id TEXT,
  porcentaje_obra_social NUMERIC(5,2) DEFAULT 3.00,
  sindicato_id TEXT,
  porcentaje_sindicato NUMERIC(5,2),
  banco TEXT,
  cbu TEXT,
  tipo_cuenta TEXT,
  forma_pago forma_pago DEFAULT 'transferencia',
  exento_ganancias BOOLEAN DEFAULT false,
  cargas_familia INTEGER DEFAULT 0,
  otros_conceptos JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_recibos_sueldo_empleado ON public.recibos_sueldo(empleado_id);
CREATE INDEX IF NOT EXISTS idx_recibos_sueldo_liquidacion ON public.recibos_sueldo(liquidacion_id);
CREATE INDEX IF NOT EXISTS idx_recibos_sueldo_periodo ON public.recibos_sueldo(periodo);
CREATE INDEX IF NOT EXISTS idx_recibo_conceptos_recibo ON public.recibo_conceptos(recibo_id);
CREATE INDEX IF NOT EXISTS idx_horas_trabajadas_empleado_periodo ON public.horas_trabajadas_registro(empleado_id, periodo);
CREATE INDEX IF NOT EXISTS idx_horas_trabajadas_fecha ON public.horas_trabajadas_registro(fecha);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_periodo ON public.liquidaciones_mensuales(periodo);
CREATE INDEX IF NOT EXISTS idx_conceptos_codigo ON public.conceptos_liquidacion(codigo);

-- 4. VISTAS SQL
-- =====================================================

CREATE OR REPLACE VIEW public.empleados_payroll_completo AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.email,
  e.legajo,
  e.dni,
  e.fecha_ingreso,
  e.rol,
  e.sucursal_id,
  e.activo,
  e.puesto,
  ecp.convenio_id,
  cc.codigo as convenio_codigo,
  cc.nombre as convenio_nombre,
  cc.horas_mensuales,
  ecp.categoria,
  ecp.porcentaje_obra_social,
  ecp.porcentaje_sindicato,
  ecp.banco,
  ecp.cbu,
  ecp.forma_pago,
  ecp.exento_ganancias,
  ecp.cargas_familia,
  eds.salario as sueldo_basico
FROM public.empleados e
LEFT JOIN public.empleados_configuracion_payroll ecp ON e.id = ecp.empleado_id
LEFT JOIN public.convenios_colectivos cc ON ecp.convenio_id = cc.id
LEFT JOIN public.empleados_datos_sensibles eds ON e.id = eds.empleado_id
WHERE e.activo = true;

-- 5. FUNCIONES SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_payroll()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol IN ('admin_rrhh', 'gerente_sucursal')
    AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.calcular_antiguedad_anios(fecha_ingreso DATE)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_ingreso))::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.calcular_horas_mes(
  p_empleado_id UUID,
  p_periodo TEXT
)
RETURNS TABLE(
  dias_trabajados INTEGER,
  horas_normales NUMERIC,
  horas_extras_50 NUMERIC,
  horas_extras_100 NUMERIC,
  ausencias INTEGER,
  llegadas_tarde INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha_inicio DATE;
  v_fecha_fin DATE;
BEGIN
  v_fecha_inicio := (p_periodo || '-01')::DATE;
  v_fecha_fin := (DATE_TRUNC('month', v_fecha_inicio) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT htr.fecha)::INTEGER as dias_trabajados,
    COALESCE(SUM(htr.horas_trabajadas), 0) as horas_normales,
    COALESCE(SUM(htr.horas_extras_50), 0) as horas_extras_50,
    COALESCE(SUM(htr.horas_extras_100), 0) as horas_extras_100,
    COUNT(DISTINCT CASE WHEN htr.ausente = true THEN htr.fecha END)::INTEGER as ausencias,
    COUNT(DISTINCT CASE WHEN htr.minutos_tarde > 0 THEN htr.fecha END)::INTEGER as llegadas_tarde
  FROM public.horas_trabajadas_registro htr
  WHERE htr.empleado_id = p_empleado_id
    AND htr.fecha BETWEEN v_fecha_inicio AND v_fecha_fin;
END;
$$;

-- 6. POLÍTICAS RLS
-- =====================================================

ALTER TABLE public.convenios_colectivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conceptos_liquidacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_sueldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibo_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_trabajadas_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados_configuracion_payroll ENABLE ROW LEVEL SECURITY;

-- Convenios
DROP POLICY IF EXISTS "Admin puede gestionar convenios" ON public.convenios_colectivos;
CREATE POLICY "Admin puede gestionar convenios"
ON public.convenios_colectivos FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver convenios activos" ON public.convenios_colectivos;
CREATE POLICY "Usuarios autenticados pueden ver convenios activos"
ON public.convenios_colectivos FOR SELECT
USING (auth.uid() IS NOT NULL AND activo = true);

-- Conceptos
DROP POLICY IF EXISTS "Admin puede gestionar conceptos" ON public.conceptos_liquidacion;
CREATE POLICY "Admin puede gestionar conceptos"
ON public.conceptos_liquidacion FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver conceptos activos" ON public.conceptos_liquidacion;
CREATE POLICY "Usuarios autenticados pueden ver conceptos activos"
ON public.conceptos_liquidacion FOR SELECT
USING (auth.uid() IS NOT NULL AND activo = true);

-- Liquidaciones
DROP POLICY IF EXISTS "Admin RRHH puede gestionar liquidaciones" ON public.liquidaciones_mensuales;
CREATE POLICY "Admin RRHH puede gestionar liquidaciones"
ON public.liquidaciones_mensuales FOR ALL
USING (can_manage_payroll())
WITH CHECK (can_manage_payroll());

DROP POLICY IF EXISTS "Gerentes pueden ver liquidaciones" ON public.liquidaciones_mensuales;
CREATE POLICY "Gerentes pueden ver liquidaciones"
ON public.liquidaciones_mensuales FOR SELECT
USING (can_manage_payroll());

-- Recibos
DROP POLICY IF EXISTS "Empleados pueden ver sus propios recibos" ON public.recibos_sueldo;
CREATE POLICY "Empleados pueden ver sus propios recibos"
ON public.recibos_sueldo FOR SELECT
USING (empleado_id = get_current_empleado());

DROP POLICY IF EXISTS "Admin RRHH puede gestionar todos los recibos" ON public.recibos_sueldo;
CREATE POLICY "Admin RRHH puede gestionar todos los recibos"
ON public.recibos_sueldo FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

DROP POLICY IF EXISTS "Gerentes pueden ver recibos de su sucursal" ON public.recibos_sueldo;
CREATE POLICY "Gerentes pueden ver recibos de su sucursal"
ON public.recibos_sueldo FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
      AND e1.rol = 'gerente_sucursal'
      AND e1.activo = true
      AND e2.id = recibos_sueldo.empleado_id
  )
);

DROP POLICY IF EXISTS "Empleados pueden firmar sus recibos" ON public.recibos_sueldo;
CREATE POLICY "Empleados pueden firmar sus recibos"
ON public.recibos_sueldo FOR UPDATE
USING (empleado_id = get_current_empleado())
WITH CHECK (empleado_id = get_current_empleado());

-- Recibo conceptos
DROP POLICY IF EXISTS "Empleados pueden ver conceptos de sus recibos" ON public.recibo_conceptos;
CREATE POLICY "Empleados pueden ver conceptos de sus recibos"
ON public.recibo_conceptos FOR SELECT
USING (
  recibo_id IN (
    SELECT id FROM recibos_sueldo WHERE empleado_id = get_current_empleado()
  )
);

DROP POLICY IF EXISTS "Admin puede gestionar conceptos de recibos" ON public.recibo_conceptos;
CREATE POLICY "Admin puede gestionar conceptos de recibos"
ON public.recibo_conceptos FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Horas trabajadas
DROP POLICY IF EXISTS "Empleados pueden ver sus horas trabajadas" ON public.horas_trabajadas_registro;
CREATE POLICY "Empleados pueden ver sus horas trabajadas"
ON public.horas_trabajadas_registro FOR SELECT
USING (empleado_id = get_current_empleado());

DROP POLICY IF EXISTS "Admin puede gestionar horas trabajadas" ON public.horas_trabajadas_registro;
CREATE POLICY "Admin puede gestionar horas trabajadas"
ON public.horas_trabajadas_registro FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

DROP POLICY IF EXISTS "Sistema puede insertar horas trabajadas" ON public.horas_trabajadas_registro;
CREATE POLICY "Sistema puede insertar horas trabajadas"
ON public.horas_trabajadas_registro FOR INSERT
WITH CHECK (true);

-- Configuración payroll
DROP POLICY IF EXISTS "Empleados pueden ver su configuración payroll" ON public.empleados_configuracion_payroll;
CREATE POLICY "Empleados pueden ver su configuración payroll"
ON public.empleados_configuracion_payroll FOR SELECT
USING (empleado_id = get_current_empleado());

DROP POLICY IF EXISTS "Admin puede gestionar configuración payroll" ON public.empleados_configuracion_payroll;
CREATE POLICY "Admin puede gestionar configuración payroll"
ON public.empleados_configuracion_payroll FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 7. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_convenios_colectivos_updated_at ON public.convenios_colectivos;
CREATE TRIGGER update_convenios_colectivos_updated_at
BEFORE UPDATE ON public.convenios_colectivos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conceptos_liquidacion_updated_at ON public.conceptos_liquidacion;
CREATE TRIGGER update_conceptos_liquidacion_updated_at
BEFORE UPDATE ON public.conceptos_liquidacion
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_liquidaciones_mensuales_updated_at ON public.liquidaciones_mensuales;
CREATE TRIGGER update_liquidaciones_mensuales_updated_at
BEFORE UPDATE ON public.liquidaciones_mensuales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_empleados_configuracion_payroll_updated_at ON public.empleados_configuracion_payroll;
CREATE TRIGGER update_empleados_configuracion_payroll_updated_at
BEFORE UPDATE ON public.empleados_configuracion_payroll
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. DATOS INICIALES
-- =====================================================

INSERT INTO public.conceptos_liquidacion (codigo, nombre, tipo, categoria, orden_impresion, activo) VALUES
('001', 'Sueldo Básico', 'remunerativo', 'haberes', 1, true),
('002', 'Antigüedad', 'remunerativo', 'haberes', 2, true),
('003', 'Presentismo', 'remunerativo', 'haberes', 3, true),
('010', 'Horas Extras 50%', 'remunerativo', 'haberes', 10, true),
('011', 'Horas Extras 100%', 'remunerativo', 'haberes', 11, true),
('020', 'Plus por Título', 'remunerativo', 'haberes', 20, true),
('021', 'Adicional por Función', 'remunerativo', 'haberes', 21, true),
('100', 'Viáticos', 'no_remunerativo', 'haberes', 100, true),
('101', 'Bono Productividad', 'no_remunerativo', 'haberes', 101, true),
('201', 'Jubilación 11%', 'deduccion', 'descuentos', 201, true),
('202', 'Ley 19.032 - 3%', 'deduccion', 'descuentos', 202, true),
('203', 'Obra Social 3%', 'deduccion', 'descuentos', 203, true),
('204', 'PAMI 1.5%', 'deduccion', 'descuentos', 204, true),
('210', 'Sindicato', 'deduccion', 'descuentos', 210, true),
('220', 'Anticipos', 'deduccion', 'descuentos', 220, true),
('221', 'Préstamos', 'deduccion', 'descuentos', 221, true),
('230', 'Embargos Judiciales', 'deduccion', 'descuentos', 230, true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.convenios_colectivos (codigo, nombre, descripcion, horas_mensuales, porcentaje_he_50, porcentaje_he_100, activo) VALUES
('130/75', 'Empleados de Comercio', 'Convenio Colectivo de Trabajo para empleados de comercio en Argentina', 200, 50.00, 100.00, true)
ON CONFLICT (codigo) DO NOTHING;