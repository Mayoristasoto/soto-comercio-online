

## Problem

Two bugs prevent the popovers from working correctly:

1. **Badge component lacks `forwardRef`**: The "Pendientes" column uses `Badge` as the `PopoverTrigger` child with `asChild`, but `Badge` is a plain function component that cannot receive refs. This causes the popover to silently fail. Console confirms: "Function components cannot be given refs."

2. **Shared state across all popovers**: All rows and all three columns (Asignados, Confirmados, Pendientes) share a single `employeeDetails` state. When one popover triggers a fetch, its data can be overwritten or shown in the wrong popover.

## Fix

### 1. Update `src/components/ui/badge.tsx`
- Wrap `Badge` with `React.forwardRef` so it can be used with `asChild` on Radix triggers.

### 2. Update `src/components/admin/MandatoryDocuments.tsx`
- Replace shared `employeeDetails` state with a keyed state using `documentoId + category` as key, so each popover tracks its own loading/data independently.
- Example: `employeeDetailsMap: Record<string, { names: string[], loading: boolean }>` keyed by `${doc.id}-${category}`.
- Each `PopoverContent` reads from its own key in the map.

