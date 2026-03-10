

## Plan: Add "Mes Entero" filter + Enhanced Resumen sheet with employee statistics

### Changes

**`src/components/admin/FichajeMetricasDashboard.tsx`**

#### 1. Add "Mes Entero" filter type
- Change `tipoFecha` state type from `'dia' | 'rango'` to `'dia' | 'rango' | 'mes'`
- Add `SelectItem value="mes"` → "Mes Entero"
- Add a month/year picker UI (two selects: month name + year) that sets `fechaInicio` to 1st day and `fechaFin` to last day of chosen month
- New state: `mesFiltro` (0-11) and `anioFiltro` (number), defaulting to current month/year
- When `tipoFecha === 'mes'`, auto-compute `fechaInicio`/`fechaFin` from month+year before querying

#### 2. Enhanced "Resumen" sheet in Excel export
Expand the Resumen sheet from simple metrics to include a full employee-level summary table. After the existing period/metric rows, add:

**Section: "ESTADÍSTICAS DESTACADAS"**
- Empleado con más llegadas tarde (name + count)
- Empleado con más minutos de exceso de pausa (name + total minutes)
- Empleado más puntual (most clock-ins with zero late arrivals)
- Empleado más responsable (fewest total incidents)

**Section: "RESUMEN POR EMPLEADO"**
Table with columns:
`Empleado | Llegadas Tarde | Min. Retraso Total | Pausas Excedidas | Min. Exceso Total | Tiempo Perdido Total (min)`

Calculated from existing `fichajesToday` (sum `minutos_retraso`) and `pausasToday` (sum `minutos_exceso`), grouped by `empleado_id`. "Tiempo Perdido" = sum of both.

### No database changes needed — all data already loaded in state.

