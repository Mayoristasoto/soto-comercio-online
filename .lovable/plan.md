

## Problem

The Role Preview shows a **flat list** of all `app_pages` items, while the actual sidebar renders them **hierarchically** (parents with children). This means the admin sees mismatched items -- parent groups like "RRHH", "Operaciones" appear alongside their children as separate flat items, which doesn't reflect the real sidebar experience.

Additionally, toggling a parent item doesn't automatically affect its children's visibility, creating inconsistencies.

## Plan

### Fix RolePreview sidebar to match actual sidebar structure

**File: `src/components/admin/RolePreview.tsx`**

1. Build hierarchical tree from `app_pages` (same logic as `useSidebarLinks`): group by `parent_id`, attach children to parents, render only root items at top level
2. Render children indented under their parent with their own switches
3. When toggling a parent group on/off, also toggle all its children for that role (batch update)
4. Show the tree with collapsible sections matching the real sidebar visual structure (RRHH > Fichero > sub-items, etc.)

No database changes needed -- only UI refactor of how items are displayed and toggled.

### Files modified

| File | Change |
|------|--------|
| `src/components/admin/RolePreview.tsx` | Refactor sidebar section to render hierarchical tree with indented children, batch toggle for parent groups |

