## Objetivo
Nuevo módulo **Entregas a Empleados** en `/rrhh/entregas` (solo admin_rrhh): matriz empleados × items donde se ve de un vistazo qué se entregó a cada uno, qué falta y qué no aplica. Click sobre la celda cicla el estado.

## Boceto (UI)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Entregas a Empleados                                [+ Gestionar items] │
│ Visualizá y registrá la entrega de uniformes/insumos por empleado.       │
│                                                                          │
│ [🔎 Buscar nombre/DNI] [Sucursal ▾] [Puesto ▾] [Estado: faltan items ▾] │
│                                                                          │
│ ┌──────────────────┬──────┬───────┬──────┬───────┬────────┬───────────┐ │
│ │ Empleado         │ Faja │ Zapat │ Gorra│ Casco │ Uniforme│ Casillero│ │
│ ├──────────────────┼──────┼───────┼──────┼───────┼────────┼───────────┤ │
│ │ Pérez, Juan      │  ✔   │  ✔    │  ✘   │  ◐    │  ✔     │  —        │ │
│ │ Sucursal Centro  │ verde│ verde │ rojo │ámbar  │ verde  │ gris      │ │
│ ├──────────────────┼──────┼───────┼──────┼───────┼────────┼───────────┤ │
│ │ Gómez, Ana       │  ✔   │  ✘    │  ✔   │  ✔    │  ◐     │  ✔        │ │
│ ├──────────────────┼──────┼───────┼──────┼───────┼────────┼───────────┤ │
│ │ López, Carlos    │  ◐   │  ◐    │  ◐   │  ◐    │  ◐     │  ◐        │ │
│ └──────────────────┴──────┴───────┴──────┴───────┴────────┴───────────┘ │
│                                                                          │
│ Leyenda: ✔ Entregado  ◐ Pendiente  ✘ No entregado  — No aplica          │
│ Resumen: 24 empleados · 18 con faltantes · 6 completos                  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Click en celda** → cicla `pendiente → entregado → no_aplica → pendiente`. Cambio inmediato (optimistic update) + toast.
- **Hover en celda** → tooltip "Entregado el 12/05/2026 por Juan Pérez".
- **Header empleado** sticky a la izquierda; columnas de items con scroll horizontal si hay muchas.
- **Botón "Gestionar items"** abre dialog para crear/editar/eliminar/reordenar items del catálogo.
- **Footer**: resumen rápido (cuántos completos, cuántos con faltantes).
- **Export CSV** opcional desde el header (para llevar a compras).

## Base de datos (migración)

```text
entregas_items
  id, nombre, descripcion, orden, activo, created_at, updated_at
  -- catálogo administrable (Faja, Zapatos, etc.)

entregas_empleado
  id, empleado_id (FK empleados), item_id (FK entregas_items),
  estado ('pendiente'|'entregado'|'no_aplica'),
  fecha_entrega (timestamptz, null si no entregado),
  registrado_por (FK empleados, null),
  observaciones (text, null),
  UNIQUE(empleado_id, item_id)
```

- RLS: SELECT/INSERT/UPDATE/DELETE para admin_rrhh; SELECT para gerente_sucursal restringido a su sucursal (vista de solo lectura).
- Trigger `update_updated_at_column` ya existe en el proyecto.
- Seed inicial sugerido (editable): Faja, Zapatos, Uniforme, Gorra, Casillero.

## Cambios en código

1. **Migración**: crear `entregas_items` y `entregas_empleado` con GRANTs y RLS.
2. **Ruta**: agregar `/rrhh/entregas` en `src/App.tsx`, accesible solo a admin_rrhh.
3. **Sidebar**: registrar entrada en `app_pages` para que aparezca en el menú RRHH (icono `Package`).
4. **Página** `src/pages/EntregasEmpleados.tsx`: layout con filtros + matriz.
5. **Componentes** en `src/components/entregas/`:
   - `MatrizEntregas.tsx` — tabla con celdas clicables (sticky col empleado).
   - `CeldaEntrega.tsx` — render del estado + tooltip + handler click (optimistic).
   - `FiltrosEntregas.tsx` — búsqueda, sucursal, puesto, estado (faltantes / completos / todos).
   - `GestionItemsDialog.tsx` — CRUD del catálogo (nombre, orden, activo).
6. **Lógica de carga**: una sola query trae empleados activos + items + registros existentes; merge en cliente para mostrar celdas faltantes como "pendiente" virtual hasta el primer click (que inserta la fila).

## Permisos
- Edición: solo `admin_rrhh`.
- Lectura: `admin_rrhh` (todos) y `gerente_sucursal` (su sucursal). Empleados no acceden.

## Fuera de alcance (para próxima iteración)
- Tallas/cantidades por item.
- Historial completo de entregas/devoluciones de un mismo item.
- Notificaciones al empleado.
