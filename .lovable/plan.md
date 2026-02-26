

## Problema

La **Vista Roles** muestra items y estructura que no coinciden exactamente con lo que el sidebar real muestra para cada rol. El preview no usa la misma lógica de filtrado que `useSidebarLinks`, causando discrepancias visibles.

Diferencias detectadas en los datos:
- El preview carga TODAS las páginas visibles sin filtrar por rol, lo cual es correcto para mostrar switches, pero la estructura y agrupación puede diferir de lo que realmente se ve
- Algunos items en la BD tienen roles como `"admin"` (sin `_rrhh`) lo que genera inconsistencias en el filtrado
- El preview no refleja visualmente cuáles items están activos vs inactivos de forma clara (los items OFF se ven muy similares a los ON)

## Plan

**Archivo: `src/components/admin/RolePreview.tsx`**

1. Mejorar la diferenciación visual entre items habilitados y deshabilitados: los deshabilitados se renderizan con texto tachado, opacidad reducida, y el switch claramente en OFF
2. Agregar un mini-preview del sidebar real al costado: una columna que muestra exactamente lo que el rol seleccionado vería (usando la misma lógica de filtrado que `useSidebarLinks` -- solo items donde `roles_permitidos` contiene el rol)
3. Al hacer toggle, actualizar ambas vistas en tiempo real (el panel de switches y el mini-preview)
4. Agregar indicador de cantidad de items visibles vs totales en el encabezado ("8 de 25 items visibles para Gerente")

**No se necesitan cambios de base de datos.**

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/RolePreview.tsx` | Agregar mini-preview real del sidebar, mejorar diferenciación visual ON/OFF |

