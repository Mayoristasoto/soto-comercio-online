

## Plan: Add employee detail popover on Asignados/Confirmados/Pendientes counts

### What changes
Make the numbers in the "Asignados", "Confirmados", and "Pendientes" columns clickable. Clicking a number opens a Popover showing the list of employee names for that category.

### Implementation

**File: `src/components/admin/MandatoryDocuments.tsx`**

1. Add new state: `detailPopover` to track which document + category is open, and `employeeDetails` to hold the fetched employee names.

2. Add a function `loadEmployeeDetails(documentoId, category)` that:
   - For **asignados**: queries `asignaciones_documentos_obligatorios` joined with `empleados` to get names of assigned employees
   - For **confirmados**: queries `confirmaciones_lectura` joined with `empleados` to get names of employees who confirmed
   - For **pendientes**: queries assigned employees minus confirmed ones

3. Replace the plain number cells (lines 610-616) with clickable `Popover` components:
   - The trigger is the number (styled as a clickable button/badge)
   - On click, fetch the employee list and display names in the popover content
   - Show a loading spinner while fetching

4. Add imports: `Popover, PopoverContent, PopoverTrigger` from `@/components/ui/popover`

### No database changes needed
All data is already available via existing tables (`asignaciones_documentos_obligatorios`, `confirmaciones_lectura`, `empleados`).

