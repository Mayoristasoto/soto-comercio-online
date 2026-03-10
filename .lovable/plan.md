

## Plan: Add section headers per incident type within each employee sheet

### Problem
Currently each employee's sheet has a flat list of all incidents. The user wants them grouped with bold section headers like "LLEGADAS TARDE" and "PAUSAS EXCEDIDAS" separating the records within each sheet.

### Change

**`src/components/admin/FichajeMetricasDashboard.tsx`** — Rewrite the per-employee sheet generation (lines 966-986):

Instead of using `json_to_sheet` on a flat list, build an array of arrays (AOA) manually:

1. Group the employee's records by `tipo` (Llegada Tarde, Pausa Excedida, etc.)
2. For each type group, insert a **title row** with just the type name in uppercase (e.g., `['LLEGADAS TARDE']`) followed by a **header row** (`['Fecha', 'Detalle 1', ...]`), then the data rows
3. Add a blank row between sections for visual separation
4. Use `XLSX.utils.aoa_to_sheet()` instead of `json_to_sheet()`

```text
Sheet: "Merino, Matias Esteban"
┌──────────────────────────────────────┐
│ LLEGADAS TARDE                       │
│ Fecha │ Detalle 1 │ Detalle 2 │ ... │
│ 03/03 │ Prog: 08  │ Real: 08:15│... │
│                                      │
│ PAUSAS EXCEDIDAS                     │
│ Fecha │ Detalle 1 │ Detalle 2 │ ... │
│ 03/03 │ Inicio: 13│ Fin: 14:10│ ... │
└──────────────────────────────────────┘
```

Column headers used per section: `Fecha | Detalle 1 | Detalle 2 | Detalle 3 | Detalle 4 | Justificado | Observaciones | Ya Registrado`

No other files changed.

