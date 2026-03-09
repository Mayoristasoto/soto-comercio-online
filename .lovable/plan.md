

## Plan: Corregir confirmación de tareas flexibles en kiosco

### Problema
Las tareas `semanal_flexible` se generan como objetos virtuales con IDs ficticios (`flex-xxx-0`). Al confirmarlas, `ConfirmarTareasDia` intenta hacer `UPDATE tareas SET estado='completada' WHERE id='flex-xxx-0'` — no existe, falla silenciosamente.

### Solución

**Modificar `ConfirmarTareasDia.tsx`** — en `handleConfirmar`, detectar si el ID es virtual (empieza con `flex-`) y en ese caso **crear la tarea real** en la tabla `tareas` en vez de intentar actualizarla:

```typescript
if (tareaId.startsWith('flex-')) {
  // Extraer plantilla_id del ID virtual
  // INSERT en tareas con estado 'completada' + plantilla_id + fecha_completada
} else {
  // UPDATE existente (flujo actual)
}
```

Para cada tarea flexible completada:
1. Insertar en `tareas` con `estado: 'completada'`, `plantilla_id`, `asignado_a: empleadoId`, `fecha_completada: now()`
2. Registrar log de auditoría con el nuevo ID real

Para las omitidas en modo bloqueo, no registrar log con ID virtual (no tiene sentido).

### Archivos a modificar
- `src/components/fichero/ConfirmarTareasDia.tsx` — lógica de `handleConfirmar` para manejar IDs virtuales

