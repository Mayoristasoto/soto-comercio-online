

## Problem

The "Novedades Alert" link was added to the hardcoded `AdminSidebar.tsx`, but the actual sidebar (`UnifiedSidebar`) reads navigation items from the `app_pages` database table. The entry is missing from that table.

## Fix

**Run a migration** to insert a new row into `app_pages` for the Novedades Alert page:

- `nombre`: "Novedades Alert"
- `path`: "/operaciones/novedades-alertas"
- `icon`: "Bell" (more descriptive than FileText)
- `mostrar_en_sidebar`: true
- `visible`: true
- `roles_permitidos`: admin roles (admin_rrhh, gerente_sucursal, lider_grupo)
- `parent_id`: the Operaciones group's id
- `orden`: appropriate position after existing Operaciones children

This single migration will make the link appear in the sidebar under Operaciones.

