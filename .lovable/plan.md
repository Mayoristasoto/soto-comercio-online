

## Plan: Integrar verificación de tareas en `ejecutarAccionDirecta`

### Problema encontrado

Hay **dos flujos de salida** en el kiosco:

1. **`ejecutarAccion`** (botones manuales) — tiene la lógica de verificación de tareas flexibles los sábados y tareas pendientes normales. Funciona correctamente.
2. **`ejecutarAccionDirecta`** (reconocimiento facial automático) — registra el fichaje directamente y resetea el kiosco **sin verificar tareas**. Este es el flujo que usaron los 4 empleados el sábado (todos con método "Facial").

Por eso nadie fue bloqueado: el flujo facial bypasea completamente la verificación de tareas.

### Solución

Modificar `ejecutarAccionDirecta` en `src/pages/KioscoCheckIn.tsx` para que, **antes de registrar el fichaje de salida**, ejecute la misma verificación que `ejecutarAccion`:

1. Si es `tipoAccion === 'salida'` y es sábado → verificar plantillas `semanal_flexible` y contar completadas en la semana
2. Si hay tareas incumplidas → guardar el empleado reconocido en estado, mostrar `ConfirmarTareasDia` con `bloquearSalida=true`, y **no registrar el fichaje** hasta que confirme
3. Si es salida cualquier día → verificar tareas pendientes normales (con fecha límite vencida/hoy)
4. Solo después de la confirmación (o si no hay tareas pendientes) → registrar el fichaje real

La lógica de verificación se extraerá a una función compartida `verificarTareasPendientesSalida(empleadoId)` para evitar duplicación entre ambos flujos.

### Archivo a modificar
- `src/pages/KioscoCheckIn.tsx`
  - Crear función `verificarTareasPendientesSalida(empleadoId)` con la lógica de sábado + tareas normales
  - En `ejecutarAccionDirecta`, si es salida: llamar a la verificación **antes** de `kiosk_insert_fichaje`. Si hay tareas pendientes, guardar datos del empleado en estado, mostrar el dialog, y diferir el fichaje
  - Agregar estado para guardar los datos necesarios para completar el fichaje después de confirmar tareas (empleadoId, empleadoData, confianza)
  - En `handleConfirmarTareasYSalir`, si hay datos pendientes de acción directa, ejecutar el fichaje real

