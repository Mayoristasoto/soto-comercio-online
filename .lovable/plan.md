
## Plan: Completar "Stock Negativo" y crear tarea diaria "Control Stock Cigarrillos"

### Paso 1: Marcar como completadas las tareas "Controles Stock Negativo"
Se actualizarán todas las tareas pendientes de "Controles Stock Negativo" a estado `completada` para los 3 gerentes (Carlos Espina, Julio Navarrete y Analia Del Valle), ya que indicaste que esa tarea está completa.

### Paso 2: Crear plantilla diaria "Control Stock Cigarrillos" para Carlos Espina
Se creará una nueva plantilla en `tareas_plantillas` con la siguiente configuración:
- **Titulo**: Control Stock Cigarrillos
- **Frecuencia**: diaria
- **Prioridad**: alta (obligatoria)
- **Asignado a**: Carlos Espina (ID: `6e1bd507-...`)
- **Sucursal**: José Martí (`9682b6cf-...`)
- **Días límite**: 0 (vence el mismo día)

Esto hará que cada día se genere automáticamente una tarea para Carlos, y le aparecerá como alerta pendiente en el kiosco al hacer check-in.

---

### Detalle técnico

**Operaciones de datos (vía insert tool):**

1. `UPDATE tareas SET estado = 'completada' WHERE titulo ILIKE '%stock negativo%' AND estado IN ('pendiente', 'en_progreso');`

2. `INSERT INTO tareas_plantillas` con los campos configurados para Carlos Espina, frecuencia diaria, prioridad alta.

3. Generar la primera tarea del día de hoy insertando directamente en `tareas` para que Carlos ya la vea sin esperar al cron de mañana.
