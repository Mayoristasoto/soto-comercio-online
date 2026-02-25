

## Iteration 7 - Finalization Plan

Scope: Productivity metrics with Recharts, automatic alerts, PDF export, sidebar integration. Admin-only access (no per-branch manager filtering).

### 1. Sidebar Integration

Add a "Finanzas" group to the `app_pages` table via SQL migration with `roles_permitidos = ['admin_rrhh']`. This ensures only admins see the link. Insert entries for:
- Parent: "Finanzas" (icon: DollarSign, path: /finanzas/rentabilidad)
- The sidebar already reads from `app_pages` filtered by role, so no code changes needed in `UnifiedSidebar.tsx`.

### 2. Productivity Metrics Component

Create `src/components/rentabilidad/MetricasProductividad.tsx`:
- Uses Recharts (already installed, pattern exists in `DashboardAnaliticas.tsx`, `DistributionChart.tsx`)
- **Bar chart**: Branch ranking by revenue per worked hour (facturacion / horas from `partes_horas`)
- **Bar chart**: Branch ranking by operating margin
- **Line chart**: Monthly evolution of key KPIs across periods (revenue, expenses, result)
- Period selector filter
- Data sourced from `snapshots_periodo` (closed) or live calculation (open periods)

### 3. Automatic Alerts Component

Create `src/components/rentabilidad/AlertasRentabilidad.tsx`:
- Scans current period data for configurable thresholds:
  - Negative operating margin (resultado_operativo < 0)
  - Labor cost exceeds 40% of revenue
  - Revenue drop > 15% vs previous period
- Displays as colored Alert cards (red/amber) within the Dashboard tab
- Pure client-side calculation, no new tables needed

### 4. PDF Export

Create `src/utils/rentabilidadPDF.ts`:
- Uses `jspdf` + `jspdf-autotable` (both already installed)
- Follows existing pattern from `informeEjecutivoPDF.ts`
- Exports: KPI summary, branch comparison table, period metadata
- Add export button to `DashboardRentabilidad.tsx`

### 5. Update Rentabilidad Page

Modify `src/pages/Rentabilidad.tsx`:
- Add new tab "Métricas" with `MetricasProductividad` component
- Integrate `AlertasRentabilidad` into the Dashboard tab

### 6. Auth Guard on Rentabilidad Page

Add admin-only check to `src/pages/Rentabilidad.tsx` similar to `FichajeMetricas.tsx`:
- Check `empleados.rol === 'admin_rrhh'`, redirect to `/dashboard` otherwise
- This is UI-only guard; RLS on all rentabilidad tables already enforces admin-only access server-side

### Files to Create
- `src/components/rentabilidad/MetricasProductividad.tsx`
- `src/components/rentabilidad/AlertasRentabilidad.tsx`
- `src/utils/rentabilidadPDF.ts`

### Files to Modify
- `src/pages/Rentabilidad.tsx` (add auth guard, new tab, alerts integration)
- `src/components/rentabilidad/DashboardRentabilidad.tsx` (add PDF export button, embed alerts)

### Database Migration
- Insert `app_pages` row for "Finanzas > Rentabilidad" with `roles_permitidos: ['admin_rrhh']`

