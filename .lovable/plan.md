

## Plan: Add bulk delete for selected late arrivals and exceeded breaks

### Problem
Currently, the user can only delete individual records one by one (via the Trash icon on each row). They want to use the same checkbox selection used for "Plasmar" to also bulk-delete multiple selected records.

### Changes

**`src/components/admin/FichajeMetricasDashboard.tsx`**

1. **Add two new bulk delete functions**:
   - `eliminarFichajesTardiosSeleccionados()` — deletes all selected IDs from `fichajes_tardios` using `.in('id', [...selectedFichajes])`
   - `eliminarPausasExcedidasSeleccionadas()` — deletes all selected IDs from `fichajes_pausas_excedidas` using `.in('id', [...selectedPausas])`
   - Both show a confirmation dialog before proceeding, clear selection after, and reload data

2. **Add "Eliminar Seleccionados" button** next to the existing "Plasmar como Cruces Rojas" button in both sections (Fichajes Tardíos and Pausas Excedidas):
   - Red outline/destructive variant with Trash2 icon
   - Shows count of selected items
   - Disabled when selection is empty
   - Uses the `useConfirm` hook for confirmation before deletion

3. **Import `useConfirm`** hook (already exists in the project) for safe confirmation before bulk delete.

