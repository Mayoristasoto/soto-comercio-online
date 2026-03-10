

## Plan: Reorder Excel export by employee instead of incident type

### Problem
Currently the export groups data by incident type (LLEGADAS TARDE, then PAUSAS EXCEDIDAS, then INCIDENCIAS). The user wants data grouped by employee name so they can see all incidents per person together.

### Solution
Modify the `prepararDatosExportar()` function in `FichajeMetricasDashboard.tsx` to:

1. Keep the RESUMEN row at the top (unchanged)
2. Combine all records (llegadas tarde, pausas excedidas, incidencias) into a single unified array with a common column structure
3. Sort by employee name (apellido, nombre) as primary key, then by date as secondary key
4. Each row keeps the "Tipo" column so the incident type is still visible

### Unified column structure per row
`Tipo | Empleado | Fecha | Hora Programada | Hora Real | Minutos Retraso | Hora Inicio | Hora Fin | Duración (min) | Permitida (min) | Exceso (min) | Justificado | Observaciones | Ya Registrado | Estado | Descripción`

Fields not applicable to a given type will be empty strings.

### File change
- `src/components/admin/FichajeMetricasDashboard.tsx` — rewrite `prepararDatosExportar()` (~lines 863-947)

