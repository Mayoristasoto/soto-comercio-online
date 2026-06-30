## Plan: Encabezados sticky en Entregas a Empleados

### Problema
Al hacer scroll vertical dentro de la página de **Entregas a Empleados**, el título de la página, los filtros y los encabezados de la tabla (Faja, Zapatos, Remera, etc.) salen de la vista. Esto dificulta saber qué ítem se está registrando mientras se recorre la lista de empleados.

### Solución
Convertir el área de título/filtros y el `<thead>` de la tabla en **encabezados sticky**, que permanezcan visibles mientras se hace scroll, respetando el header unificado ya existente.

### Cambios a realizar

1. **Sticky del título y filtros (`src/pages/EntregasEmpleados.tsx`)**
   - Envolver el bloque del título + filtros en un contenedor sticky.
   - Posicionarlo debajo del header unificado (offset `top-14 md:top-16` ~ `56px` / `64px`).
   - Usar `z-30` para quedar por encima de la tabla pero debajo del header unificado (`z-40`).
   - Fondo semántico (`bg-background` o `bg-muted/50`) + borde inferior para separar visualmente.

2. **Sticky del `<thead>` de la tabla**
   - Ajustar la posición `top` del `<thead>` para que quede justo debajo del título/filtros sticky.
   - Usar `z-20` para quedar por encima de las filas.
   - Mantener el fondo semántico (`bg-muted/50`) y el borde.

3. **Compatibilidad con scroll horizontal**
   - Preservar `overflow-x-auto` del contenedor de la tabla.
   - Asegurar que la primera columna "Empleado" siga siendo sticky horizontalmente (`sticky left-0`) y conserve su z-index correcto.

### Detalles técnicos

- El scroll vertical ocurre en el `<main className="flex-1 overflow-auto">` de `UnifiedLayout.tsx`, por lo que los elementos sticky deben ser descendientes directos de ese contenedor.
- No se requieren cambios de base de datos ni lógica de negocio; solo ajustes de layout CSS.
- Se mantendrán los colores semánticos del tema actual (no hardcodear colores).

### Resultado esperado

Al scrollear hacia abajo, el usuario seguirá viendo:
1. El título "Entregas a Empleados" y los filtros de búsqueda.
2. La fila de encabezados de la tabla con los nombres de los ítems (Faja, Zapatos, Remera, etc.).
3. La columna del empleado seguirá fija al hacer scroll horizontal.