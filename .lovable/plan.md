

## Plan: Crear plantilla "Control Stock Cigarrillos" y bloquear fichaje sábado

### Paso 1: Insertar plantilla de tarea

Insertar en `tareas_plantillas` una plantilla semanal flexible para Carlos Espina (ID: `6e1bd507-5956-45cf-97d9-2d07f55c9ccb`):

- **Título**: Control Stock Cigarrillos
- **Frecuencia**: `semanal_flexible`
- **Veces por semana**: 3
- **Recordatorio fin de semana**: true
- **Categoría**: Operaciones (`414f4d67-5c1d-453a-bec4-cfdf5782b5c1`)
- **Empleados asignados**: `["6e1bd507-5956-45cf-97d9-2d07f55c9ccb"]`
- **Sucursal**: José Martí (`9682b6cf-f904-4497-918c-d0c9c061b9ec`)
- **Prioridad**: alta

### Paso 2: Modificar lógica de salida del sábado en KioscoCheckIn.tsx

Actualmente, al fichar salida se verifica si hay tareas pendientes con fecha límite vencida. Se agregará una verificación adicional:

**Los sábados**, antes de permitir fichar salida, consultar las tareas `semanal_flexible` del empleado en la semana actual y verificar si cumplió la cantidad mínima de veces (`veces_por_semana`). Si no cumplió:

1. Mostrar el dialog `ConfirmarTareasDia` con las tareas incompletas
2. **Bloquear la salida** — eliminar el botón "Omitir por ahora" cuando hay tareas de tipo semanal_flexible no cumplidas en sábado
3. El empleado debe marcar las tareas como completadas para poder fichar salida

**Cambios en `ejecutarAccion`** (~línea 1530):
```typescript
// Si es sábado y salida, verificar tareas semanal_flexible
if (tipoAccion === 'salida' && new Date().getDay() === 6) {
  // Consultar plantillas semanal_flexible asignadas al empleado
  // Contar tareas completadas esta semana vs veces_por_semana
  // Si no cumple, mostrar ConfirmarTareasDia con bloqueo
}
```

**Cambios en `ConfirmarTareasDia`**:
- Agregar prop `bloquearSalida?: boolean`
- Cuando `bloquearSalida = true`, ocultar botón "Omitir por ahora" y no permitir cerrar el dialog sin completar las tareas obligatorias

### Detalle técnico

La consulta del sábado:
1. Obtener plantillas con `frecuencia = 'semanal_flexible'` asignadas al empleado
2. Contar tareas `completada` de esas plantillas en la semana (lunes-domingo)
3. Comparar contra `veces_por_semana`
4. Si faltan, generar/mostrar las tareas pendientes y bloquear salida

