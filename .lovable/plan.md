

# Tareas con frecuencia semanal configurable y recordatorio de fin de semana

## Problema actual

La plantilla "Control Ofertas" esta configurada como frecuencia "diaria", lo que genera una tarea todos los dias con fecha limite fija. Lo que se necesita es:

1. Poder configurar que aparezca **X veces por semana** (ej: 3 veces)
2. **Sin fecha limite fija** por tarea individual
3. Un **recordatorio el ultimo dia laboral de la semana** si no se alcanzo la cantidad objetivo

## Solucion propuesta

### Cambios en base de datos

Agregar 2 columnas a la tabla `tareas_plantillas`:

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `veces_por_semana` | integer | null | Cantidad de veces que debe realizarse la tarea en la semana (ej: 3) |
| `recordatorio_fin_semana` | boolean | false | Si se muestra recordatorio el ultimo dia de la semana cuando no se cumplio el objetivo |

Agregar 1 columna a la tabla `tareas`:

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `plantilla_id` | uuid (FK a tareas_plantillas) | null | Para poder rastrear cuantas tareas de esta plantilla se completaron en la semana |

### Logica de generacion (edge function)

Modificar `generar-tareas-diarias` para manejar la nueva frecuencia `semanal_flexible`:

1. Contar cuantas tareas de esa plantilla ya fueron **generadas** esta semana (lunes a domingo) usando `tareas_generadas_log`
2. Si la cantidad generada es menor a `veces_por_semana`, generar una nueva tarea **sin fecha_limite** (null)
3. Si es el ultimo dia laboral de la semana (sabado, configurable) y la cantidad **completada** es menor al objetivo, generar una tarea con flag de recordatorio

### Cambios en la interfaz de plantillas

En `TaskTemplates.tsx`, al seleccionar frecuencia:

- Nueva opcion: **"Semanal flexible"** (valor: `semanal_flexible`)
- Al elegirla, aparece un campo numerico: "Veces por semana" (1-7)
- Toggle: "Recordatorio si no se cumplio al final de la semana"
- Se oculta el campo "Dias limite" (no aplica)

### Cambios en el kiosco

Cuando la tarea tiene `fecha_limite = null`:
- No mostrar fecha limite en la alerta de tareas pendientes
- Si es tarea de recordatorio de fin de semana, mostrar mensaje especial: "Esta semana se realizo X de Y veces"

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| **Migracion SQL** | Agregar columnas `veces_por_semana`, `recordatorio_fin_semana` a `tareas_plantillas` y `plantilla_id` a `tareas` |
| `src/components/tasks/TaskTemplates.tsx` | Agregar opcion "Semanal flexible", campo numerico de veces por semana, toggle de recordatorio. Ocultar "Dias limite" cuando es semanal flexible |
| `supabase/functions/generar-tareas-diarias/index.ts` | Agregar logica para frecuencia `semanal_flexible`: contar generadas en la semana, generar solo si faltan, agregar `plantilla_id` a las tareas creadas |
| `src/components/kiosko/TareasPendientesAlert.tsx` | No mostrar fecha limite si es null. Mostrar info de progreso semanal para tareas de recordatorio |

### Flujo de uso

1. Editar la plantilla "Control Ofertas"
2. Cambiar frecuencia a "Semanal flexible"
3. Poner "3 veces por semana"
4. Activar "Recordatorio si no se cumplio"
5. Al generar tareas diarias: solo se crea si aun no se alcanzaron las 3 veces esa semana
6. El sabado (ultimo dia laboral): si solo se hicieron 1 de 3, aparece recordatorio al empleado

