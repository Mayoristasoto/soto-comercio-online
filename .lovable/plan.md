

## Plan: Replace + button with inline employee assignment

The current + button tries to switch tabs via DOM query, which doesn't work. Instead, when clicking +, show a list of unassigned employees directly inside the popover, with checkboxes to assign them.

### Implementation in `src/components/admin/MandatoryDocuments.tsx`

1. **Add new state** for unassigned employees per document:
   - `unassignedMap: Record<string, { employees: {id, nombre, apellido}[], loading: boolean }>`

2. **Add `loadUnassigned(documentoId)` function**:
   - Fetch assigned employee IDs from `asignaciones_documentos_obligatorios`
   - Fetch all active employees from `empleados`
   - Filter out already-assigned ones
   - Store in `unassignedMap[documentoId]`

3. **Add `assignEmployee(documentoId, empleadoId)` function**:
   - Insert into `asignaciones_documentos_obligatorios`
   - Set `debe_firmar_documentos_iniciales = true` on the employee
   - Refresh stats, assigned list, and unassigned list

4. **Replace the + button behavior**:
   - On click, toggle a "show unassigned" section within the same popover
   - Show a scrollable list of unassigned employees with a + button next to each name
   - After assigning, remove from unassigned list and add to assigned list

