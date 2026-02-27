

## Plan

### 1. Add PDF export button (executive report style)

**File: `src/pages/ReporteLlegadasTardeGerentes.tsx`**

- Add a `generarPDFEjecutivo` function using `jsPDF` + `jspdf-autotable` that generates a professional executive report matching the existing PDF style (`pdfStyles.ts`):
  - Page 1: Header with logo + title, period info, executive summary cards (total late arrivals, total minutes, managers with incidents, worst offender)
  - Page 2+: Detail table per manager with columns: Gerente, Sucursal, Llegadas Tarde, Total Min, % Días Tarde, Prom Min/Vez
  - Page 3+: Daily detail table (Fecha, Día, H. Programada, H. Real, Min Tarde) grouped by manager
  - Footer on all pages with company info and page numbers
- Add PDF button next to the existing XLSX button (use a dropdown with both options, or two separate buttons)

### 2. Add delete/annul option per late arrival row

**File: `src/pages/ReporteLlegadasTardeGerentes.tsx`**

- In the expanded detail rows, add a context/dropdown menu (three-dot icon or right-click) on each `llegadaTarde` row
- Menu option: "Eliminar llegada tarde" (actually soft-delete: sets `anulada = true` on `empleado_cruces_rojas`)
- Show a `ConfirmDialog` before executing the annulment
- After confirming, update the record in Supabase (`anulada: true`, `motivo_anulacion`) and refresh data
- Import `DropdownMenu` components and `ConfirmDialog`

### Files modified

| File | Change |
|------|--------|
| `src/pages/ReporteLlegadasTardeGerentes.tsx` | Add PDF export function, add dropdown menu per detail row with annul option |

