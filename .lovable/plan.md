## Plan: Ordenamiento por columna en Listado de vacaciones

Hacer que los encabezados de la tabla en `ListadoVacaciones.tsx` sean clickeables para ordenar ascendente/descendente, manteniendo los filtros globales existentes tal cual.

### Cambios

**`src/components/vacaciones/ListadoVacaciones.tsx`**

1. Agregar estado de ordenamiento:
   - `sortKey`: clave de columna (empleado, sucursal, fecha_ingreso, antiguedad, lct, pendientes, aprobadas, consumidos, restantes)
   - `sortDir`: `"asc" | "desc"`
   - Default: ordenar como hoy (más solicitudes primero, luego alfabético) cuando no hay sort activo.

2. Reemplazar cada `<TableHead>` por un botón clickeable que:
   - Muestra el texto del título + ícono (`ChevronsUpDown` cuando inactivo, `ChevronUp`/`ChevronDown` cuando activo).
   - Al hacer click: si es la misma columna, alterna asc↔desc; si es otra, la activa en asc.
   - Cursor pointer y hover sutil.

3. Aplicar ordenamiento sobre `filtradas` con un nuevo `useMemo` (`filtradasOrdenadas`):
   - Comparador por tipo de dato (string con `localeCompare`, número directo, fecha parseada).
   - Si no hay `sortKey`, se respeta el orden actual.

4. Renderizar `filtradasOrdenadas` en el `TableBody` (en lugar de `filtradas`).

### Sin cambios

- Filtros globales (búsqueda, año, estado, sucursal, excluir inactivos) se mantienen idénticos.
- Lógica de carga de datos, totales, expansión de filas y exportación CSV no se tocan.
