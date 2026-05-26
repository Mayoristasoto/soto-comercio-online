## Objetivo
Permitir que **admin_rrhh** cambie el estado de cualquier solicitud de vacaciones desde el calendario (no solo las pendientes): pasar a **pendiente**, **rechazada** o **aprobada**, sea cual sea su estado actual.

## Comportamiento actual
- El popover solo se abre para solicitudes en estado `pendiente`.
- Las solicitudes `aprobada` o `gozadas` solo se muestran como chip de color, sin interacción.

## Cambios en `src/components/vacaciones/CalendarioVacaciones.tsx`

1. **Abrir popover para todos los estados** cuando `rol === 'admin_rrhh'` (no solo pendientes). Gerentes siguen viendo el popover solo en pendientes (comportamiento actual).
2. **Mostrar el estado actual** en el header del popover con su Badge correspondiente.
3. **Agregar una sección "Cambiar estado"** (solo para admin_rrhh) con tres botones:
   - **Marcar pendiente** (vuelve a `pendiente`, limpia `aprobado_por`, `fecha_aprobacion`, `comentarios_aprobacion`).
   - **Aprobar** (estado `aprobada`, registra aprobador y fecha; deshabilitado si ya está aprobada).
   - **Rechazar** (estado `rechazada`, requiere comentario; deshabilitado si ya está rechazada).
4. La sección de **reasignar empleado** queda disponible siempre para admin_rrhh (hoy solo en pendientes); aplica la misma validación de solapamiento.
5. Tras cualquier cambio, refrescar el calendario y mostrar toast.

## UI del Popover (admin_rrhh, cualquier estado)

```text
┌─────────────────────────────────┐
│ Juan Pérez                       │
│ 12 jul – 20 jul 2026             │
│ [Aprobada]                       │
│                                  │
│ Reasignar a otro empleado:       │
│ [ Combobox buscable ▾ ]          │
│ [ Reasignar empleado ]           │
│ ───────────────────────────────  │
│ Cambiar estado:                  │
│ Comentario (obligatorio rechazo) │
│ [ Pendiente ] [ Aprobar ] [ Rech ]│
└─────────────────────────────────┘
```

Los chips de solicitudes no-pendientes mantienen su color sólido; al hacer click admin_rrhh ve el popover.

## Base de datos
Sin migraciones. `solicitudes_vacaciones` ya permite UPDATE de `estado`, `aprobado_por`, `fecha_aprobacion`, `comentarios_aprobacion` para admin_rrhh.

## Detalles técnicos
- Generalizar `handleDecision` a `handleCambioEstado(solicitudId, nuevoEstado)`:
  - `pendiente`: `{ estado: 'pendiente', aprobado_por: null, fecha_aprobacion: null, comentarios_aprobacion: null }`.
  - `aprobada`: igual al flujo actual de aprobación.
  - `rechazada`: igual al flujo actual de rechazo (requiere comentario).
- Condición de apertura del popover: `(isPending && puedeAprobar) || puedeReasignar`.
- Deshabilitar el botón del estado actual para evitar updates no-op.
- Si el estado pasa a uno fuera de `aprobada/gozadas/pendiente` (ej. `rechazada`), el chip desaparecerá tras `fetchVacaciones` (la query ya filtra esos tres estados).
