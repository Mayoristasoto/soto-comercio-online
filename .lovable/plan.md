

# Plan: Sistema de Gestion Operativa y Analisis de Rentabilidad por Sucursal

## Contexto actual

El proyecto ya tiene una base significativa que se puede reutilizar:

**Tablas existentes reutilizables:**
- `sucursales` (id, nombre, direccion, activa, ciudad, provincia) -- falta CUIT
- `empleados` (id, nombre, apellido, dni, fecha_ingreso, sucursal_id, puesto, activo, etc.) -- falta CUIL (tiene dni), fecha_baja, centro_costo
- `conceptos_liquidacion` -- conceptos de payroll existentes
- `convenios_colectivos` -- convenios ya configurados
- `liquidaciones_mensuales` -- liquidaciones existentes
- `recibos_sueldo` -- recibos con sueldo_basico, total_haberes, total_descuentos, neto
- `recibo_conceptos` -- detalle de conceptos por recibo
- `empleados_configuracion_payroll` -- config de payroll por empleado

**Tablas que NO existen y hay que crear (nuevas):**
- `centros_costo`
- `asignacion_empleado_sucursal` (distribucion porcentual multi-sucursal)
- `periodos_contables` (con estado abierto/cerrado)
- `liquidacion_sueldo_operativo` (vista operativa de costos, distinta al recibo)
- `parametros_cargas_sociales` (alicuotas parametrizables)
- `cargas_sociales_calculadas`
- `importacion_f931` (registros del formulario 931)
- `partes_horas`
- `gastos_sucursal`
- `facturacion_sucursal`
- `snapshots_periodo` (cierre de periodo)
- `prorrateo_gastos` (distribucion de gastos entre sucursales)

---

## Alcance y fases

Dado el volumen (12 modulos completos con ~15 tablas nuevas, ~20 componentes, dashboards, importadores, calculos financieros), este proyecto debe construirse en fases incrementales. Intentar todo en un solo paso generaria errores y seria inmanejable.

### FASE 1 - Base de datos y estructura (2-3 iteraciones)

**Migracion 1: Tablas estructurales**
```sql
-- Enum para tipo de centro de costo
CREATE TYPE centro_costo_tipo AS ENUM ('operativo', 'ventas', 'administrativo', 'deposito', 'otro');

-- Enum para estado de periodo
CREATE TYPE periodo_estado AS ENUM ('abierto', 'cerrado');

-- Agregar CUIT a sucursales
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS cuit TEXT;

-- Centros de costo
CREATE TABLE centros_costo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo centro_costo_tipo NOT NULL DEFAULT 'operativo',
  sucursal_id UUID REFERENCES sucursales(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar centro_costo y fecha_baja a empleados
ALTER TABLE empleados 
  ADD COLUMN IF NOT EXISTS centro_costo_id UUID REFERENCES centros_costo(id),
  ADD COLUMN IF NOT EXISTS fecha_baja DATE,
  ADD COLUMN IF NOT EXISTS cuil TEXT;

-- Asignacion multi-sucursal
CREATE TABLE asignacion_empleado_sucursal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  porcentaje_distribucion NUMERIC(5,2) NOT NULL CHECK (porcentaje_distribucion > 0 AND porcentaje_distribucion <= 100),
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Periodos contables
CREATE TABLE periodos_contables (
  id TEXT PRIMARY KEY, -- formato YYYY-MM
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado periodo_estado DEFAULT 'abierto',
  cerrado_por UUID REFERENCES empleados(id),
  fecha_cierre TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Migracion 2: Tablas financieras**
```sql
-- Parametros de cargas sociales (parametrizable)
CREATE TABLE parametros_cargas_sociales (
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
CREATE TABLE cargas_sociales_calculadas (
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
CREATE TABLE partes_horas (
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
CREATE TABLE gastos_sucursal (
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

-- Prorrateo de gastos
CREATE TABLE prorrateo_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id UUID NOT NULL REFERENCES gastos_sucursal(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  porcentaje NUMERIC(5,2) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Facturacion por sucursal
CREATE TABLE facturacion_sucursal (
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

-- Importacion F931
CREATE TABLE importacion_f931 (
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
CREATE TABLE snapshots_periodo (
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
```

**RLS:** Se crearan politicas basadas en el rol del usuario usando la funcion `user_has_admin_role()` existente + validaciones para gerentes que solo vean su sucursal.

---

### FASE 2 - Componentes frontend (4-5 iteraciones)

Crear un nuevo modulo "Rentabilidad" accesible desde la navegacion, con tabs:

**Archivos a crear:**
- `src/pages/Rentabilidad.tsx` -- pagina principal con tabs
- `src/components/rentabilidad/PeriodosContables.tsx` -- CRUD de periodos + cierre
- `src/components/rentabilidad/CentrosCosto.tsx` -- CRUD centros de costo
- `src/components/rentabilidad/AsignacionMultiSucursal.tsx` -- asignacion porcentual
- `src/components/rentabilidad/CargaSueldos.tsx` -- carga de liquidaciones con distribucion
- `src/components/rentabilidad/ParametrosCargasSociales.tsx` -- config alicuotas
- `src/components/rentabilidad/CargaGastos.tsx` -- CRUD gastos + prorrateo
- `src/components/rentabilidad/CargaFacturacion.tsx` -- CRUD facturacion
- `src/components/rentabilidad/ImportadorF931.tsx` -- importacion CSV/Excel con conciliacion
- `src/components/rentabilidad/PartesHoras.tsx` -- carga de horas por sucursal
- `src/components/rentabilidad/DashboardRentabilidad.tsx` -- dashboard ejecutivo
- `src/components/rentabilidad/MetricasProductividad.tsx` -- KPIs por sucursal
- `src/components/rentabilidad/CierrePeriodo.tsx` -- boton cierre + snapshot

**Archivo a modificar:**
- `src/App.tsx` -- agregar ruta `/finanzas/rentabilidad`
- `src/components/UnifiedSidebar.tsx` -- agregar seccion "Finanzas" en sidebar

---

### FASE 3 - Dashboard ejecutivo y calculos (2-3 iteraciones)

- Vistas SQL o funciones RPC para calcular rentabilidad en tiempo real
- Graficos con Recharts: ranking sucursales, evolucion mensual, comparativas
- Alertas automaticas (margen negativo, costo laboral alto, datos faltantes)
- Exportacion PDF del informe de rentabilidad

---

## Orden de implementacion sugerido

Dado que Lovable funciona mejor con cambios incrementales, la recomendacion es:

1. **Iteracion 1**: Migracion de tablas estructurales (centros_costo, periodos, asignaciones) + RLS
2. **Iteracion 2**: Migracion de tablas financieras (gastos, facturacion, cargas sociales, F931, snapshots) + RLS
3. **Iteracion 3**: Pagina principal + Periodos + Centros de Costo
4. **Iteracion 4**: Carga de sueldos + Parametros de cargas sociales
5. **Iteracion 5**: Gastos + Facturacion + Partes de horas
6. **Iteracion 6**: Importador F931
7. **Iteracion 7**: Dashboard ejecutivo + Metricas de productividad
8. **Iteracion 8**: Cierre de periodo + Snapshots + Permisos por rol

Cada iteracion sera un mensaje separado para mantener calidad y estabilidad.

---

## Nota importante

Este es un sistema financiero complejo con 12 modulos interconectados. Construirlo todo de una vez garantiza errores. El enfoque correcto es iterativo: base de datos primero, luego componentes uno por uno, y finalmente el dashboard que consolida todo.

Si aprobas este plan, empezamos por la **Iteracion 1**: crear las tablas estructurales base.

