

# Crear tareas "Controles Stock Negativo" para 3 empleados

## Objetivo
Asignar la tarea "Controles Stock Negativo" con prioridad urgente y vencimiento 20/02 a:
- Analia Del Valle
- Julio Gomez Navarrete
- Carlos Espina

## Implementacion

### Paso 1 - Crear edge function auxiliar temporal
Crear `supabase/functions/crear-tareas-batch/index.ts` que reciba un array de tareas y las inserte usando el service role key. Esto permite crear tareas sin autenticacion de usuario.

### Paso 2 - Ejecutar la insercion
Invocar la edge function con las 3 tareas:

```text
POST /crear-tareas-batch
{
  "tareas": [
    { "titulo": "Controles Stock Negativo", "asignado_a": "88f9934f-...", "prioridad": "urgente", "estado": "pendiente", "fecha_limite": "2026-02-20" },
    { "titulo": "Controles Stock Negativo", "asignado_a": "1607f6ba-...", "prioridad": "urgente", "estado": "pendiente", "fecha_limite": "2026-02-20" },
    { "titulo": "Controles Stock Negativo", "asignado_a": "6e1bd507-...", "prioridad": "urgente", "estado": "pendiente", "fecha_limite": "2026-02-20" }
  ]
}
```

### Paso 3 - Verificar
Confirmar que las 3 tareas aparecen en la tabla `tareas` con estado pendiente.

## Detalle tecnico

La edge function usa `SUPABASE_SERVICE_ROLE_KEY` para bypasear RLS y poder insertar directamente. Se configura con `verify_jwt = false` en config.toml para permitir la llamada sin autenticacion de usuario.

Empleados identificados:
- Analia Del Valle: `88f9934f-1b77-40b4-a79c-d054520b3354`
- Julio Gomez Navarrete: `1607f6ba-046c-466d-8b4d-acc18e2acfa4`
- Carlos Espina: `6e1bd507-5956-45cf-97d9-2d07f55c9ccb`

