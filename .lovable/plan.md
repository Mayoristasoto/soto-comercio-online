## Objetivo

Convertir el flujo actual de "Calcular → PDF" en un flujo con etapa de **aprobación previa**:

1. Calcular jornadas (igual que hoy).
2. Revisar en pantalla con checkboxes (por jornada y por empleado) + filtros adicionales sobre la tabla.
3. Generar el **Informe de Tesorería (PDF)** únicamente con lo aprobado.
4. Al exportar, registrar en BD una **liquidación de horas extras aprobada** (cabecera + ítems) para historial y para servir de base al futuro paso de aprobación por gerentes.

---

## 1. Cambios en BD (migración)

Dos tablas nuevas (con RLS, solo `admin`/`rrhh` por ahora):

**`liquidaciones_horas_extras`** (cabecera del lote)
- `id`, `created_at`, `created_by`
- `fecha_desde`, `fecha_hasta` (date)
- `sucursal_id` (nullable, "all" = null), `sucursal_label`
- `estado` text — `aprobado_rrhh` (default). Preparado para `pendiente_gerente`, `aprobado_gerente`, `liquidado`.
- `config_snapshot` jsonb (valores de hora hábil/domingo, tolerancia, redondeo del momento)
- `total_hs_habil`, `total_hs_domingo`, `total_monto` numeric
- `cantidad_jornadas`, `cantidad_empleados` int
- `observaciones` text

**`liquidaciones_horas_extras_items`** (jornadas aprobadas)
- `id`, `liquidacion_id` (FK cascade)
- `empleado_id`, `empleado_nombre` (denormalizado)
- `sucursal_id`, `sucursal_nombre`
- `fecha` date, `es_domingo` bool
- `entrada`, `salida` text
- `base_hs` numeric
- `exceso_real_min` int
- `extra_hs` numeric
- `redondeo_label` text
- `valor_hora` numeric, `monto` numeric

RLS: SELECT/INSERT para roles `admin` y `rrhh` usando `has_role(auth.uid(), ...)`. UPDATE solo cambia `estado`/`observaciones` (para futuro flujo gerentes).

---

## 2. Cambios en `ReporteHorasExtras.tsx`

### Estado nuevo
- `aprobadas: Set<string>` — clave por jornada (`empleadoId|fecha`). Por defecto **todas tildadas** tras `Calcular`.
- Filtros locales sobre la tabla detalle:
  - Buscador de texto (empleado/sucursal).
  - Toggle: Todos / Solo hábiles / Solo domingos.
  - Toggle: "Solo con pagado > 0".
  - Rango de minutos de exceso (min/max numéricos).

### UI tabla detalle
- Columna nueva al inicio: checkbox por fila.
- Header con checkbox maestro "Aprobar todas (visibles)".
- Por cada empleado, **fila resumen plegable** con su propio checkbox que tilda/destilda todas sus jornadas del período.
- Contador en el card: "X de Y jornadas aprobadas — $ZZZ a pagar".
- Tarjeta KPI superior recalcula totales en vivo según `aprobadas`.

### Botones
- "Calcular" (igual).
- **"Aprobar y generar Tesorería"** reemplaza al actual "Informe Tesorería (PDF)":
  1. Filtra `jornadas` por `aprobadas`.
  2. Recalcula resumen por empleado con ese subset.
  3. Llama `generarReporteHorasExtrasPDF` con el subset (no con `fichajes` crudos).
  4. Inserta cabecera + items en las nuevas tablas vía supabase client.
  5. Toast con id de liquidación + opción "Ver en historial".

### Tabla resumen por empleado
- Recalculada en vivo desde el subset aprobado.
- Checkbox por fila que togglea todas sus jornadas.

---

## 3. Cambios en `reporteHorasExtrasPDF.ts`

- Aceptar opcionalmente un set de jornadas pre-calculadas (en vez de recalcular desde `fichajes`), para que el PDF refleje exactamente lo aprobado.
- Mantener firma actual como fallback.
- Footer del PDF: leyenda "Aprobado por RRHH — pendiente de revisión gerencial" cuando aplique.

---

## 4. Fuera de alcance (próximo paso)

- Vista/historial de liquidaciones guardadas.
- Flujo de aprobación por gerentes (ya queda la tabla preparada con `estado`).
- Notificaciones a gerentes.

---

## Archivos a tocar

- `supabase/migrations/...` (nueva, 2 tablas + RLS)
- `src/components/admin/payroll/ReporteHorasExtras.tsx` (UI aprobación + filtros + persistencia)
- `src/utils/reporteHorasExtrasPDF.ts` (aceptar subset aprobado)

¿Avanzo con la migración?
