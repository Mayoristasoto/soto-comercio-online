

## Plan: Excel export with separate sheets per employee

### Problem
The current export puts all records in a single sheet sorted by employee. The user wants each employee on their own separate sheet (workbook tab) with the employee name as the sheet title.

### Solution
Replace the `ExportButton` usage with a custom export button that generates a multi-sheet Excel workbook using XLSX directly.

### Changes

**`src/components/admin/FichajeMetricasDashboard.tsx`**

1. Replace `ExportButton` with a custom `Button` that calls a new `exportarExcelMultiHoja()` function.

2. New `exportarExcelMultiHoja()` function:
   - Sheet 1: **"Resumen"** — contains the summary row (metrics totals)
   - Remaining sheets: one per employee, named with employee name (e.g., "Espina, Carlos"), containing only that employee's incidents with columns: Tipo, Fecha, Detalle 1-4, Justificado, Observaciones, Ya Registrado
   - Group records by employee name from the existing unified `registros` array
   - Use `XLSX.utils.book_new()`, create sheets with `XLSX.utils.json_to_sheet()`, append each with `XLSX.utils.book_append_sheet()`
   - Sheet names truncated to 31 chars (Excel limit)
   - Save with `XLSX.writeFile()`

3. Keep CSV export as single-sheet fallback via existing `ExportButton` (or remove if user prefers Excel-only).

