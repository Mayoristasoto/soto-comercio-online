# Tareas pendientes para encargados: recordatorio en kiosco y tarjeta en su panel

## Objetivo
Que los encargados vean sus tareas pendientes al fichar en el kiosco (propias + las delegadas por RRHH) y que en su panel individual tengan una tarjeta de acceso a Tareas con contador y las 3 más urgentes.

## 1. Recordatorio en el kiosco
El kiosco ya muestra la alerta de tareas pendientes al hacer check-in (`TareasPendientesAlert`) y ya tiene un flujo especial para `gerente_sucursal` (diálogo de tareas delegadas por RRHH para distribuir).

Cambios:
- En el check-in de un empleado con rol `gerente_sucursal` / `gerente`, unificar el recordatorio: además de sus tareas propias, incluir en la misma alerta las tareas que RRHH le delegó y siguen pendientes.
- Marcar visualmente cada ítem con su origen: "Propia" o "Delegada por RRHH".
- Encabezado adaptado cuando es encargado: "Recordatorio de tareas del encargado" con el conteo por origen.
- Mantener intacto el bloqueo de salida y el diálogo de distribución existente; esto es solo informativo/recordatorio en la entrada.

## 2. Tarjeta en el panel del encargado
- Agregar un acceso nuevo "Tareas pendientes" (ruta `/rrhh/tareas` según la ruta real de Tareas) a la configuración compartida de accesos del encargado, editable desde la vista previa de RRHH igual que las demás tarjetas.
- Esa tarjeta muestra:
  - Badge con la cantidad de pendientes del encargado.
  - Listado compacto de las 3 más urgentes (título, prioridad, vencimiento) con estado vacío ("Sin tareas pendientes").
  - Click en la tarjeta o en un ítem lleva a la sección de Tareas.

## Detalles técnicos
- Kiosco (`src/pages/KioscoCheckIn.tsx`): al armar `tareasPendientes`, si el rol es encargado, sumar el resultado de la consulta de tareas delegadas por RRHH (misma lógica que `obtenerTareasParaDistribuirGerente`, filtrando pendientes) y deduplicar por `id`.
- `src/components/kiosko/TareasPendientesAlert.tsx`: agregar props opcionales `esEncargado` y `origen` por tarea para el título y los badges; sin cambios de lógica de countdown ni impresión.
- Nuevo hook `src/hooks/useTareasEncargado.ts`: cuenta pendientes y devuelve las 3 más urgentes del empleado logueado (`tareas.asignado_a`, estados `pendiente`/`en_progreso`, orden por `fecha_limite` y prioridad).
- `src/components/dashboard/DashboardEncargado.tsx`: soporte para render extra en la tarjeta con clave `tareas` (badge + mini listado).
- `src/hooks/useEncargadoAccesos.ts`: agregar la entrada por defecto `tareas` (icono `ClipboardList`, orden 5).
- Migración: insertar la fila `tareas` en `encargado_dashboard_accesos` para que todos los encargados la vean y RRHH pueda editarla.

## Fuera de alcance
- No se cambia la generación de tareas ni el bloqueo de salida por tareas incumplidas.
