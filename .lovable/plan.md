

## Plan: Simulación realista fichado salida sábado 14/3 con datos reales

### Contexto
Carlos Espina y Julio Gomez Navarrete tienen tareas `semanal_flexible` con 0/3 completadas esta semana. El sábado 14 de marzo, si fichan salida, deberían ser bloqueados.

### Cambio en `src/pages/TestKioskoAlertas.tsx`

Agregar una nueva card **"Simulación Fichado Salida Sábado 14/3"** que:

1. **Selector de empleado** entre Carlos Espina y Julio Gomez Navarrete (con sus IDs reales)
2. **Botón "Simular Fichado Salida"** que:
   - Consulta `tareas_plantillas` con `semanal_flexible` para el empleado seleccionado
   - Cuenta tareas completadas esta semana (lunes 9 - sábado 14)
   - Muestra un log visual paso a paso: "Reconocimiento facial → Verificando tareas → X incumplidas → Bloqueado"
   - Si hay incumplimiento → abre `ConfirmarTareasDia` con `bloquearSalida=true` y las tareas generadas dinámicamente desde la DB
3. **Log visual** con los pasos del flujo y resultado (bloqueo o libre)
4. El `onConfirm` solo muestra toast, sin tocar DB

### Empleados reales
- Carlos Espina: `6e1bd507-5956-45cf-97d9-2d07f55c9ccb` — "Control Stock Cigarrillos" (0/3)
- Julio Gomez Navarrete: `1607f6ba-046c-466d-8b4d-acc18e2acfa4` — "Control Ofertas" (0/3)

### Lógica de simulación
Replica la misma lógica de `verificarTareasPendientesSalida` del kiosco pero **forzando `esSabado = true`** para que funcione cualquier día de la semana como test. Consulta directa a la DB para mostrar datos reales.

