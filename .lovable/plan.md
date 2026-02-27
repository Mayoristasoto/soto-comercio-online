

## Plan: Marcar 77 tareas pendientes como vencidas

Usar el Edge Function `crear-tareas-batch` con acción `update` para cambiar el estado de todas las tareas pendientes a `vencida`.

### Paso 1: Actualizar tareas via Edge Function

Invocar `crear-tareas-batch` con:
```json
{
  "action": "update",
  "table": "tareas",
  "data": { "estado": "vencida" },
  "filters": { "estado": "pendiente" }
}
```

Esto cambia las 77 tareas de `pendiente` → `vencida`, preservando el historial completo.

### Paso 2: Resetear plantillas para nueva generación

Limpiar `ultima_generacion` en `tareas_plantillas` para que el ciclo diario genere tareas frescas:
```json
{
  "action": "update",
  "table": "tareas_plantillas",
  "data": { "ultima_generacion": null },
  "filters": { "activa": true }
}
```

### Resultado
- 77 tareas quedan como `vencida` (historial intacto)
- Plantillas listas para generar nuevas tareas en el próximo ciclo
- No se necesitan cambios de código

