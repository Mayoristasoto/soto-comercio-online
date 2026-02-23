
## Plan: Tareas obligatorias con bloqueo de fichaje

### Resumen
Agregar un campo `obligatoria` a las tareas. Cuando una tarea es obligatoria y tiene fecha de vencimiento (viernes), el empleado NO puede fichar salida sin marcarla como completada. Se elimina el boton "Omitir" para tareas obligatorias.

### Paso 1: Migración de base de datos
Agregar columna `obligatoria` (boolean, default false) a las tablas:
- `tareas` - para cada tarea individual
- `tareas_plantillas` - para que las nuevas tareas generadas hereden el flag

```sql
ALTER TABLE tareas ADD COLUMN obligatoria boolean DEFAULT false;
ALTER TABLE tareas_plantillas ADD COLUMN obligatoria boolean DEFAULT false;
```

### Paso 2: Actualizar la plantilla de "Control Stock Cigarrillos"
- Cambiar `frecuencia` de `diaria` a `semanal` (o mantener diaria con fecha limite el viernes)
- Marcar `obligatoria = true`
- Ajustar `dias_limite_default` para que venza el viernes de cada semana

Dado que la tarea debe verificarse el viernes, la configuración será:
- Frecuencia: **diaria** (se genera todos los días para control diario)
- Fecha limite: **viernes** de esa semana (se acumulan y vencen el viernes)
- `obligatoria = true`

### Paso 3: Modificar `ConfirmarTareasDia` component
Cambios en `src/components/fichero/ConfirmarTareasDia.tsx`:
- Cargar el campo `obligatoria` en la query de tareas
- Si hay tareas obligatorias sin marcar como completadas:
  - Deshabilitar el botón "Omitir por ahora"
  - Deshabilitar el botón "Confirmar y Salir" hasta que TODAS las obligatorias estén chequeadas
  - Mostrar un mensaje claro: "Tienes tareas obligatorias pendientes. Debes confirmarlas para poder fichar salida."
- Si solo hay tareas no-obligatorias, el flujo sigue como hasta ahora (puede omitir)

### Paso 4: Actualizar la Edge Function `generar-tareas-diarias`
- Propagar el campo `obligatoria` de la plantilla a la tarea generada
- Calcular la fecha limite como el viernes de la semana actual cuando corresponda

### Paso 5: Actualizar datos existentes
- Marcar la plantilla de Carlos Espina como `obligatoria = true`
- Actualizar la tarea de hoy (si existe) con `obligatoria = true` y `fecha_limite` al viernes

---

### Detalle técnico

**Archivos a modificar:**
1. **Migración SQL** - Agregar columna `obligatoria` a `tareas` y `tareas_plantillas`
2. **`src/components/fichero/ConfirmarTareasDia.tsx`** - Bloquear salida si hay obligatorias sin completar
3. **`supabase/functions/generar-tareas-diarias/index.ts`** - Propagar `obligatoria` y calcular fecha limite viernes
4. **Datos** - Actualizar plantilla y tarea actual via edge function insert

**Lógica de bloqueo en el kiosco:**
- Al intentar salir, se cargan tareas pendientes
- Se separan en obligatorias y opcionales
- Si hay obligatorias: botón "Omitir" deshabilitado, "Confirmar y Salir" solo habilitado cuando todas las obligatorias estén tildadas
- Mensaje visual destacado para las tareas obligatorias (borde rojo, icono de candado)
