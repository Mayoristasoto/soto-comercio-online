
# Corregir alertas de tareas en check-in facial

## Problema encontrado

Julio Gomez Navarrete tiene fichajes completos todos los dias (viernes, sabado, domingo, lunes y hoy) y tiene 2 tareas pendientes ("Control Ofertas") que la funcion RPC devuelve correctamente. Sin embargo, **nunca le aparecio la alerta de tareas pendientes**.

### Causa raiz

El flujo de **reconocimiento facial para entrada** tiene un bug: en la linea 856 de `KioscoCheckIn.tsx`, despues de obtener las tareas y guardarlas en el estado, se llama directamente a `resetKiosco()` **sin verificar si hay tareas pendientes**. Esto limpia todo el estado del kiosco antes de que el modal `TareasPendientesAlert` pueda mostrarse.

En contraste, el flujo de **PIN** (linea 1446-1452) si verifica las tareas y muestra la alerta correctamente antes de resetear.

### Comparacion de flujos

```text
Flujo PIN (funciona bien):
  1. Registra fichaje
  2. Obtiene tareas
  3. SI hay tareas -> muestra alerta -> return (no resetea)
  4. SI NO hay tareas -> resetKiosco()

Flujo Facial Entrada (bug):
  1. Registra fichaje
  2. Obtiene tareas
  3. resetKiosco()  <-- siempre resetea, ignora tareas
```

## Solucion

### Archivo: `src/pages/KioscoCheckIn.tsx`

Modificar el flujo de entrada facial (alrededor de linea 843-856) para que, despues de reproducir el audio, verifique si hay tareas pendientes antes de resetear:

- Si hay tareas pendientes: mostrar `setShowTareasPendientesAlert(true)` y hacer `return` (igual que el flujo PIN)
- Si no hay tareas: llamar `resetKiosco()` como antes

El cambio es reemplazar la llamada directa a `resetKiosco()` en la linea 856 por:

```text
// Mostrar alerta de tareas pendientes si hay
if (tareas && tareas.length > 0) {
  setShowTareasPendientesAlert(true)
  return  // resetKiosco se llama al cerrar la alerta
}
resetKiosco()
```

### Impacto

- Los empleados que fichan por reconocimiento facial ahora veran las alertas de tareas pendientes al hacer check-in de entrada
- El comportamiento sera consistente con el flujo de PIN
- Las actividades se registraran correctamente en `tareas_actividad_log`
- No hay cambios en base de datos, solo correccion de logica en frontend
