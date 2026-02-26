

## Plan: Add search filter to unassigned employees list

### File: `src/components/admin/MandatoryDocuments.tsx`

1. **Add state** `searchUnassigned: Record<string, string>` to track search text per document.

2. **Add search input** (with `Search` icon from lucide) right after the "Agregar empleados" heading (line 754), before the employee list.

3. **Filter the unassigned list** by the search term — match against `nombre` and `apellido` (case-insensitive).

4. **Increase ScrollArea height** from `max-h-40` to `max-h-48` for better usability.

