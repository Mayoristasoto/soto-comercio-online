## Objetivo

Agregar en `/rrhh/vacaciones` una nueva pestaña que liste a los empleados que **no tienen ninguna solicitud de vacaciones cargada en el año en curso** (independientemente del estado: pendiente, aprobada o rechazada → si no existe ninguna, aparece).

## Alcance

- Solo lectura / visualización. No se modifica lógica de aprobación, saldos ni bloqueos.
- Visible para roles que ya ven las pestañas de gestión (mismo criterio que "Aprobaciones" y "Bloqueos" — admin/RRHH).

## UI

Nueva pestaña **"Sin cargar"** en `src/pages/Vacaciones.tsx`, junto a Aprobaciones, Bloqueos y Calculadora.

Nuevo componente: `src/components/vacaciones/EmpleadosSinVacaciones.tsx`

Contenido:
- Encabezado con el año en curso y contador total ("X empleados sin solicitudes en 2026").
- Filtros:
  - Sucursal (select)
  - Puesto (select)
  - Buscador por nombre/apellido/DNI
- Tabla con columnas:
  - Empleado (nombre + apellido)
  - DNI
  - Sucursal
  - Puesto
  - Fecha de ingreso
  - Días disponibles (de `vacaciones_saldo` del año en curso, si existe; si no, "—")
  - Acción rápida: botón "Cargar solicitud" que abre el diálogo de carga manual ya existente (`CargaManualVacacionesDialog`) precargado con ese empleado.
- Botón "Exportar CSV" con los registros filtrados.
- Estado vacío amable cuando todos cargaron.

## Lógica de datos

Query en el componente:
1. Traer empleados activos (`empleados` con `activo = true`).
2. Traer `solicitudes_vacaciones` del año en curso (`fecha_inicio >= '<año>-01-01'` y `fecha_inicio <= '<año>-12-31'`), seleccionando solo `empleado_id` distinct.
3. En el cliente, filtrar empleados cuyo `id` no aparece en ese set.
4. Cruzar con `vacaciones_saldo` (año en curso) para mostrar días disponibles.
5. Cruzar con `sucursales` y `puestos` para mostrar nombres.

## Archivos

- **Nuevo:** `src/components/vacaciones/EmpleadosSinVacaciones.tsx`
- **Editar:** `src/pages/Vacaciones.tsx` — agregar `TabsTrigger` y `TabsContent` "sin-cargar" dentro del bloque de permisos de gestión.

## No incluye

- No modifica `vacaciones_saldo` ni genera solicitudes automáticas.
- No envía notificaciones a los empleados (se puede agregar después si lo pedís).
- No cambia el esquema de base de datos.
