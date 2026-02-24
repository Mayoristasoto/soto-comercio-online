
-- =====================================================
-- ITERACIÓN 1: Tablas estructurales para Rentabilidad
-- =====================================================

-- Enum para tipo de centro de costo
DO $$ BEGIN
  CREATE TYPE centro_costo_tipo AS ENUM ('operativo', 'ventas', 'administrativo', 'deposito', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum para estado de periodo
DO $$ BEGIN
  CREATE TYPE periodo_estado AS ENUM ('abierto', 'cerrado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Agregar CUIT a sucursales
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS cuit TEXT;

-- =====================================================
-- Tabla: centros_costo
-- =====================================================
CREATE TABLE IF NOT EXISTS centros_costo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo centro_costo_tipo NOT NULL DEFAULT 'operativo',
  sucursal_id UUID REFERENCES sucursales(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE centros_costo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access centros_costo"
  ON centros_costo FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "Authenticated read centros_costo"
  ON centros_costo FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- Agregar columnas a empleados
-- =====================================================
ALTER TABLE empleados 
  ADD COLUMN IF NOT EXISTS centro_costo_id UUID REFERENCES centros_costo(id),
  ADD COLUMN IF NOT EXISTS fecha_baja DATE,
  ADD COLUMN IF NOT EXISTS cuil TEXT;

-- =====================================================
-- Tabla: asignacion_empleado_sucursal
-- =====================================================
CREATE TABLE IF NOT EXISTS asignacion_empleado_sucursal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  porcentaje_distribucion NUMERIC(5,2) NOT NULL CHECK (porcentaje_distribucion > 0 AND porcentaje_distribucion <= 100),
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asignacion_empleado_sucursal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access asignacion_empleado_sucursal"
  ON asignacion_empleado_sucursal FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "Authenticated read asignacion_empleado_sucursal"
  ON asignacion_empleado_sucursal FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- Tabla: periodos_contables
-- =====================================================
CREATE TABLE IF NOT EXISTS periodos_contables (
  id TEXT PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado periodo_estado DEFAULT 'abierto',
  cerrado_por UUID REFERENCES empleados(id),
  fecha_cierre TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE periodos_contables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access periodos_contables"
  ON periodos_contables FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "Authenticated read periodos_contables"
  ON periodos_contables FOR SELECT
  TO authenticated
  USING (true);
