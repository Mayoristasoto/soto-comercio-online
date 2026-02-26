

## Plan: Weekend Check-in Statistics + Manager Staff Confirmation for Sundays/Holidays

### What We're Building

Three features:

1. **Weekend Fichaje Statistics Report** -- A new tab in ReportesHorarios showing Saturday/Sunday check-in data with schedule configuration analysis (tolerance, scheduled times, late arrivals pattern)
2. **Manager Staff Confirmation for Sundays** -- Allow `gerente_sucursal` to confirm/assign rotating staff for upcoming Sundays from their own interface
3. **Manager Staff Confirmation for Holidays** -- Same for holidays, with data structured to support future finance/cost integration

---

### Technical Details

#### Feature 1: Weekend Statistics Report

**New component**: `src/components/fichero/ReporteFinesDesemana.tsx`

Queries `fichajes` table filtered by Saturday (day 6) and Sunday (day 0) for a date range. Cross-references with `fichado_turnos` (via `empleado_turnos`) to show:
- Per-employee: scheduled entry time, actual entry time, minutes late, tolerance configured (`tolerancia_entrada_minutos`), pause duration configured vs actual
- Summary cards: total Saturday fichajes, total Sunday fichajes, average late minutes, employees with 30+ min tolerance (configuration flag)
- Table highlighting configuration anomalies (e.g., if all employees show exactly 30 min late, it means `tolerancia_entrada_minutos` is likely misconfigured)
- Also cross-reference `fichajes_tardios` for pre-calculated late data
- Filter by sucursal, date range

**Modified file**: `src/pages/ReportesHorarios.tsx` -- Add new "Fines de Semana" tab (5th tab)

#### Feature 2 & 3: Manager Staff Confirmation

**New component**: `src/components/fichero/ConfirmacionStaffEspecial.tsx`

A page/component accessible to `gerente_sucursal` that:
- Shows upcoming Sundays and holidays (from `dias_feriados`)
- Allows the manager to select employees for their branch, assign entry/exit times
- Writes to the existing `asignaciones_especiales` table (already has `tipo: 'domingo' | 'feriado'`, `empleado_id`, `sucursal_id`, `hora_entrada`, `hora_salida`)
- Adds a `confirmado_por` and `confirmado_at` field to track manager confirmation (DB migration)
- Shows cost estimate preview (hours * employee count) for future finance integration

**DB Migration**: Add columns to `asignaciones_especiales`:
- `confirmado_por` (UUID, FK to empleados, nullable)
- `confirmado_at` (timestamptz, nullable)  
- `costo_hora_estimado` (numeric, nullable) -- for future finance integration

**New page**: `src/pages/ConfirmacionStaffGerente.tsx` -- Manager-facing view filtered to their branch
- Route: `/operaciones/confirmacion-staff`
- Accessible to `gerente_sucursal` and `admin_rrhh`

**Modified files**:
- `src/App.tsx` -- Add route
- `src/components/admin/AdminSidebar.tsx` or `src/components/UnifiedSidebar.tsx` -- Add menu link under Operaciones

### Files Summary

| File | Action |
|------|--------|
| `src/components/fichero/ReporteFinesDesemana.tsx` | New -- weekend statistics component |
| `src/pages/ReportesHorarios.tsx` | Modified -- add 5th tab |
| `src/components/fichero/ConfirmacionStaffEspecial.tsx` | New -- manager staff assignment UI |
| `src/pages/ConfirmacionStaffGerente.tsx` | New -- page wrapper with auth |
| `src/App.tsx` | Modified -- add route |
| `src/components/UnifiedSidebar.tsx` | Modified -- add menu link |
| Migration SQL | Add `confirmado_por`, `confirmado_at`, `costo_hora_estimado` to `asignaciones_especiales` |

