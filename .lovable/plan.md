## Objetivo

Agregar una nueva sección dentro de **Nómina** para generar el reporte de **Horas Extras** (mismo formato del PDF v5/abril) directamente desde la app, con filtros por período, empleados y sucursal.

## Ubicación

- Nuevo tab "Horas Extras" dentro de `src/pages/Nomina.tsx` (junto a Empleados, Documentos, etc.).
- Nuevo componente: `src/components/admin/payroll/ReporteHorasExtras.tsx`.

## UI del componente

Filtros (en una Card):
- **Período**: dos date pickers (Desde / Hasta) con presets rápidos: "Mes actual", "Mes pasado", "Últimos 30 días", "Personalizado".
- **Sucursal**: Select con opción "Todas" + lista desde `sucursales`.
- **Empleados**: multi-select con buscador (popover + checkboxes) + opción "Todos". Lista cargada de `empleados` activos, filtrable por sucursal seleccionada.
- Botones: **Vista previa** (tabla en pantalla) y **Descargar PDF**.

Resultados:
- Tabla con columnas: Fecha, Empleado, Sucursal, Entrada, Salida, Base, Hs extra. Domingos resaltados (`#fde7d3` / `#e04403`).
- Resumen por empleado: Hs extra hábil, Hs extra DOMINGO, Total trabajado DOMINGO.
- Totales generales al pie.

## Lógica de cálculo (idéntica a v5/abril)

- Query a `fichajes` con `fecha BETWEEN desde AND hasta`, join `empleados` + `sucursales`.
- Aplicar filtros de empleados/sucursal en el query.
- Para cada jornada con `hora_entrada` y `hora_salida`:
  - `horas_brutas = salida − entrada`
  - Si `dow = 0` (domingo): base 4h, extra = `max(0, brutas − 4)`
  - Si día hábil: base 8h, extra = `max(0, brutas − 8)`
- Solo incluir jornadas con extra > 0 en el detalle; los totales por empleado suman todo.

## Generación PDF

- Cliente con **jsPDF + jspdf-autotable** (ya usado en otros reportes del proyecto, ej. `reporteLlegadasTardePDF.ts`).
- Nuevo archivo `src/utils/reporteHorasExtrasPDF.ts` que reproduce el layout del v5: encabezado con logo/colores corporativos (Primary `#4b0d6d`, Accent `#e04403`), tabla de detalle con filas de domingo resaltadas, sección de resumen por empleado, totales finales.
- Nombre archivo: `reporte_horas_extras_{YYYY-MM-DD}_{YYYY-MM-DD}.pdf`.

## Permisos

- Solo visible para `admin_rrhh` (mismo guard que el resto de Nómina, ya implementado en `checkAccess`).

## Consideraciones técnicas

- Fechas en zona Argentina vía `src/lib/dateUtils.ts` (regla del proyecto).
- Date picker con `pointer-events-auto` en Calendar (regla shadcn).
- No crear tablas nuevas: usa `fichajes`, `empleados`, `sucursales` existentes.
- No requiere edge function — todo en cliente con queries Supabase y jsPDF.

## Archivos

Nuevos:
- `src/components/admin/payroll/ReporteHorasExtras.tsx`
- `src/utils/reporteHorasExtrasPDF.ts`

Modificados:
- `src/pages/Nomina.tsx` — agregar tab y trigger.
