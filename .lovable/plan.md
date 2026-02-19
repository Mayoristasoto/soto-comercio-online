
# Cancelar tarea de Mariano Galeote

## Situacion actual
Solo hay 1 tarea pendiente que no pertenece a los 3 empleados indicados:

| Empleado | Tarea | Vencimiento | Prioridad |
|----------|-------|-------------|-----------|
| Mariano Matias Galeote (Legajo 7) | Poner a la venta Huevos de pascua Biznike | 17/01 (vencida) | Urgente |

Las tareas de Analia Del Valle, Julio Navarrete y Carlos Espina no se tocan.

## Accion
Ejecutar una migracion SQL para cancelar esa unica tarea:

```text
UPDATE tareas SET estado = 'cancelada'
WHERE id = '3e2d538d-1996-4cab-b1fa-1a0edb2ba463';
```

## Resultado esperado
Solo quedaran tareas pendientes para los 3 empleados solicitados.
