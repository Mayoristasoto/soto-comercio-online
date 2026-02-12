

# Alertas en fichaje con PIN

## Problema actual

Cuando un empleado ficha con reconocimiento facial, el sistema verifica y muestra alertas de:
- Llegada tarde (con registro de cruz roja)
- Pausa excedida (con registro de cruz roja)
- Tareas pendientes

Cuando un empleado ficha con PIN, el componente `FicheroPinAuth` maneja todo internamente (busqueda, PIN, seleccion de accion, foto, fichaje via RPC) y al finalizar solo llama `onSuccess` que muestra un toast y resetea el kiosco, sin disparar ninguna alerta.

## Solucion

Modificar el callback `onSuccess` del PIN en `KioscoCheckIn.tsx` (lineas 2392-2407) para que, en lugar de resetear inmediatamente, ejecute la misma logica de alertas que usa el flujo facial. Concretamente:

### 1. Actualizar `onSuccess` del PIN (KioscoCheckIn.tsx, lineas 2392-2407)

Despues de recibir `empleadoId`, `empleadoData`, `fichajeId` y `tipoFichaje`:

1. Setear `recognizedEmployee` con los datos del empleado (necesario para que los modales de alerta funcionen, ya que todos dependen de `recognizedEmployee`)
2. Setear `registroExitoso` y `ultimoTipoFichaje`
3. Ocultar `showPinAuth`
4. Ejecutar la logica de alertas segun el tipo de fichaje:
   - **Si es `entrada`**: verificar llegada tarde (misma logica de lineas 1606-1698), obtener tareas pendientes, y mostrar alertas correspondientes
   - **Si es `pausa_fin`**: recalcular pausa en tiempo real (misma logica de lineas 1722-1795), obtener tareas pendientes, y mostrar alertas
   - **Si es `entrada` o `pausa_fin`**: mostrar alerta de tareas pendientes si hay
   - **Otros tipos**: resetear normalmente

### 2. Extraer logica de alertas a funciones reutilizables

Para evitar duplicacion masiva de codigo, extraer tres funciones:

- `verificarLlegadaTarde(empleadoId, fichajeId, empleadoData)` - extrae la logica de verificacion de llegada tarde (actualmente duplicada en dos lugares)
- `verificarPausaExcedida(empleadoId, fichajeId, empleadoData)` - extrae la logica de pausa excedida
- `verificarYMostrarTareasPendientes(empleadoId)` - extrae la logica de obtener y mostrar tareas

Estas funciones retornan `true` si mostraron una alerta (para saber si hacer return o continuar el flujo).

### 3. Reemplazar codigo duplicado

Actualizar los dos flujos existentes (acciones directas ~linea 1248 y `procesarAccionFichaje` ~linea 1606) para usar las funciones extraidas.

## Detalle tecnico

```text
PIN onSuccess callback:
  1. setRecognizedEmployee({ id, data, confidence: 1.0 })
  2. setShowPinAuth(false)
  3. setUltimoTipoFichaje(tipoFichaje)
  4. Obtener tareas pendientes (kiosk_get_tareas)
  5. Si entrada -> verificarLlegadaTarde() -> si alerta, return
  6. Si pausa_fin -> verificarPausaExcedida() -> si alerta, return
  7. Si entrada/pausa_fin y hay tareas -> mostrar TareasPendientesAlert, return
  8. Si nada de lo anterior -> resetKiosco()
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/KioscoCheckIn.tsx` | Extraer funciones de alerta, actualizar onSuccess del PIN, refactorizar flujos existentes |

No se requieren cambios en `FicheroPinAuth.tsx` ya que este componente seguira devolviendo los mismos datos; toda la logica de alertas vive en `KioscoCheckIn.tsx`.
