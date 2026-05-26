## Objetivo
Permitir que **admin_rrhh** reasigne una solicitud de vacaciones **pendiente** a otro empleado directamente desde el calendario, sin perder la vista actual de info.

## Cambios en `src/components/vacaciones/CalendarioVacaciones.tsx`

Extender el `Popover` que ya aparece al hacer click en un chip pendiente (solo visible para quien puede aprobar). Agregar:

1. **Combobox de empleados** (buscable, usando `Command` de shadcn) cargando los empleados activos una sola vez al montar el componente, con búsqueda por nombre/apellido/DNI.
2. Mostrar el empleado actual preseleccionado y un botón **"Reasignar"** que actualiza `solicitudes_vacaciones.empleado_id` para esa solicitud.
3. Tras reasignar, refrescar el calendario (`fetchVacaciones`) y mostrar toast de éxito.
4. La reasignación queda **gated**: solo se renderiza si `rol === 'admin_rrhh'` y el estado de la solicitud es `pendiente`.
5. Validación previa: si el nuevo empleado ya tiene otra solicitud que solapa esas fechas, bloquear con toast informativo (consulta rápida a `solicitudes_vacaciones` filtrando por `empleado_id` y rango).

## UI del Popover (estado pendiente, admin_rrhh)

```text
┌─────────────────────────────────┐
│ Juan Pérez                       │
│ 12 de jul – 20 de jul 2026       │
│ [Pendiente]                      │
│                                  │
│ Reasignar a otro empleado:       │
│ [ Combobox buscable ▾ ]          │
│ [ Reasignar empleado ]           │
│ ───────────────────────────────  │
│ Comentario (rechazo)             │
│ [ Aprobar ]   [ Rechazar ]       │
└─────────────────────────────────┘
```

Para estados no-pendientes el popover sigue igual (no se abre, mismo comportamiento que hoy).

## Base de datos
No requiere migración: `solicitudes_vacaciones.empleado_id` ya es editable y las políticas RLS existentes para admin_rrhh permiten el `UPDATE`.

## Detalles técnicos
- Cargar empleados activos en un `useEffect` separado (mismo patrón que `fetchSucursalesYPuestos`).
- Usar `Popover` + `Command`/`CommandInput`/`CommandItem` para el selector buscable.
- Estado local `nuevoEmpleadoId: Record<solicitudId, string>` análogo a `comentario`.
- Conflicto: `select id from solicitudes_vacaciones where empleado_id = :nuevoId and estado in ('aprobada','pendiente','gozadas') and fecha_inicio <= :fin and fecha_fin >= :inicio and id != :solicitudId`.
