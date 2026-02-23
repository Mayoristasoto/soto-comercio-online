

## Plan: Tareas obligatorias con bloqueo de fichaje

### Resumen
Agregar columna `obligatoria` a la base de datos y modificar el componente de confirmacion de tareas para que bloquee el fichaje de salida cuando hay tareas obligatorias sin completar.

### Paso 1: Migracion de base de datos
Agregar columna `obligatoria` (boolean, default false) a:
- `tareas`
- `tareas_plantillas`

### Paso 2: Actualizar datos existentes
Usando la edge function `crear-tareas-batch`:
- Marcar la plantilla de "Control Stock Cigarrillos" como `obligatoria = true`
- Marcar las tareas actuales de Carlos Espina como `obligatoria = true`

### Paso 3: Modificar `ConfirmarTareasDia.tsx`
- Agregar `obligatoria` al interface `Task` y a la query de Supabase
- Separar tareas en obligatorias y opcionales
- Tareas obligatorias: borde rojo, badge "OBLIGATORIA" con icono de candado
- Boton "Omitir por ahora": deshabilitado si hay obligatorias pendientes sin marcar
- Boton "Confirmar y Salir": deshabilitado hasta que TODAS las obligatorias esten chequeadas
- Mensaje de alerta: "Tienes tareas obligatorias. Debes confirmarlas para fichar salida."

### Paso 4: Actualizar Edge Function `generar-tareas-diarias`
- Agregar `obligatoria` al interface `Plantilla`
- Propagar `obligatoria` de la plantilla a cada tarea generada
- Para plantillas con `obligatoria = true`, calcular `fecha_limite` como el viernes de la semana actual

### Detalle tecnico

**Archivos a modificar:**
1. Nueva migracion SQL (schema)
2. `src/components/fichero/ConfirmarTareasDia.tsx` - logica de bloqueo UI
3. `supabase/functions/generar-tareas-diarias/index.ts` - propagar campo obligatoria y fecha limite viernes
4. Datos via edge function - actualizar plantilla y tareas existentes

**Logica de bloqueo:**
- Se detectan tareas con `obligatoria = true` y estado `pendiente`
- Si alguna obligatoria no esta chequeada: "Omitir" deshabilitado, "Confirmar y Salir" deshabilitado
- Visual: las obligatorias aparecen primero, con borde rojo y badge con candado
- Las tareas no-obligatorias se pueden omitir normalmente

**Calculo fecha limite viernes:**
```text
En la edge function, para plantillas obligatorias:
  - Obtener dia de la semana actual
  - Calcular dias hasta viernes (5 - dayOfWeek)
  - Si es sabado/domingo, usar viernes siguiente
  - Asignar esa fecha como fecha_limite
```

