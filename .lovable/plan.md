## Objetivo

Extender la sección **Reporte de Horas Extras** (ya existe en `Nómina`) para que calcule el **monto a pagar** por empleado con valores configurables y tolerancia, y genere un informe para Tesorería.

## Qué ya existe (se reutiliza)

- Página: `Nómina → tab "Horas Extras"` (`src/components/admin/payroll/ReporteHorasExtras.tsx`).
- Selección de período (desde/hasta + presets mes actual / mes pasado / últimos 30 días).
- Selección por sucursal y empleados (multi-select).
- Cálculo de jornadas y resumen (hábil vs domingo) y PDF (`src/utils/reporteHorasExtrasPDF.ts`).

## Qué se agrega

### 1. Panel de configuración (persistente)
Nueva tarjeta "Parámetros de cálculo" con:
- **Valor hora extra hábil** ($/h)
- **Valor hora extra domingo** ($/h) — (también aplicable a feriados, ver pregunta abajo)
- **Tolerancia (minutos)** — si las horas extras de la jornada son menores a este umbral, no se computan (evita sumar minutos sueltos).
- **Base hábil (h)** y **Base domingo (h)** — ya están fijas en 8/4, las hago editables por si cambia.

Persistencia: tabla nueva `config_horas_extras` (singleton por organización) con RLS para admin/RRHH; carga al abrir y guarda al editar. Fallback inicial a `localStorage`.

### 2. Presets de período
Agregar **"Esta semana"** y **"Semana pasada"** (lunes a domingo, hora Argentina) a los presets actuales.

### 3. Cálculo monetario
En `calcularJornadas` / `calcularResumen`:
- Aplicar tolerancia: `if (extraMin < tolerancia) extraHs = 0`.
- Resumen por empleado agrega: `montoHabil`, `montoDomingo`, `montoTotal`.
- Totales generales: total hs / total $ del período.

### 4. UI de resultados
- Nueva columna **Monto $** en la tabla "Resumen por empleado" (hábil, domingo, total).
- Fila de **Totales** al pie con horas y monto a pagar.
- Badge destacado con el **TOTAL A PAGAR** arriba del resumen.

### 5. Informe para Tesorería (PDF)
Extender `reporteHorasExtrasPDF.ts`:
- Encabezado con período, sucursal, parámetros usados (valores y tolerancia).
- Tabla de detalle (ya existe).
- Tabla resumen con columnas: Empleado | Hs hábil | $ hábil | Hs domingo | $ domingo | **Total $**.
- Pie con **TOTAL GENERAL A PAGAR**, espacio para firma de RRHH y Tesorería.
- Nombre archivo: `liquidacion_horas_extras_{desde}_{hasta}.pdf`.

### 6. Exportación complementaria
Botón **"Exportar Excel"** (CSV) con el resumen por empleado para que Tesorería pueda importarlo.

## Detalles técnicos

- Migración SQL: tabla `config_horas_extras` (id, valor_hora_habil, valor_hora_domingo, tolerancia_minutos, base_habil_horas, base_domingo_horas, updated_at, updated_by) + RLS (lectura admin/rrhh, escritura admin).
- Tolerancia se aplica **por jornada** (no por período acumulado).
- Cálculo de domingo sigue usando `toArgentinaTime` (consistente con la memoria de TZ Argentina).
- Colores corporativos del PDF ya están en `pdfStyles` (Primary `#4b0d6d`, etc.).

## Preguntas a confirmar antes de implementar

1. **Feriados**: ¿se pagan como domingo, como hábil, o querés un tercer valor configurable?
2. **Tolerancia**: ¿descarta toda la jornada si está bajo el umbral (mi propuesta), o redondea hacia abajo en bloques (ej: bloques de 30 min)?
3. **Configuración global vs por sucursal**: ¿un solo set de valores para toda la empresa, o distinto por sucursal?
4. **Excel/CSV**: ¿lo agrego o alcanza con PDF?