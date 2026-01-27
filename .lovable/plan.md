
## Plan: Corregir Alerta de Pausa Excedida en Kiosco

### Problema Identificado

Gonzalo Justiniano fichó `pausa_fin` hoy con una pausa de **11 minutos** pero solo tiene **1 minuto** permitido. Sin embargo:
- La alerta de pausa excedida **NO se mostró**
- La cruz roja **NO se registró** en la base de datos
- El usuario sí vio el recordatorio de tareas

**Diagnóstico técnico:**

El problema está en que `verificarPausaActiva()` se llama cuando el empleado es reconocido facialmente, pero hay un posible **problema de timing/race condition** donde el estado `pausaActiva` podría:

1. No setearse correctamente antes de que se ejecute `procesarAccionFichaje`
2. Ser reseteado por otro efecto antes de la verificación final
3. Fallar silenciosamente sin propagar el estado `excedida: true`

Además, la función solo verifica el último fichaje `pausa_inicio` pero no recalcula los minutos en el momento exacto del `pausa_fin`.

---

### Solución Propuesta

#### Cambio 1: Recalcular pausa excedida al momento de registrar `pausa_fin`

En lugar de depender del estado `pausaActiva` calculado previamente, recalcular los minutos de pausa directamente en `procesarAccionFichaje` justo antes de verificar si fue excedida.

**Archivo:** `src/pages/KioscoCheckIn.tsx`

```text
Ubicación: función procesarAccionFichaje, antes de la verificación de pausa excedida (línea ~1522)

ANTES:
- Se verifica si pausaActiva?.excedida es true (dependiendo del estado previo)

DESPUÉS:
- Recalcular directamente los minutos de pausa consultando el último pausa_inicio
- Obtener los minutos permitidos del turno del empleado
- Calcular si excedió en el momento exacto del pausa_fin
- Mostrar alerta y registrar cruz roja según el cálculo actualizado
```

#### Cambio 2: Agregar logs de debug más detallados

Para diagnosticar futuros problemas, agregar logs que muestren:
- El valor exacto de `pausaActiva` al momento de la verificación
- El resultado del cálculo de minutos
- Si la alerta fue mostrada o no

#### Cambio 3: Sincronizar el cálculo en `ejecutarAccionDirecta`

La función `ejecutarAccionDirecta` también tiene la misma verificación (líneas 1193-1238). Aplicar el mismo fix para garantizar consistencia.

---

### Cambios Específicos

| Archivo | Líneas Aprox. | Descripción |
|---------|---------------|-------------|
| `src/pages/KioscoCheckIn.tsx` | 1500-1570 | En `procesarAccionFichaje`: recalcular minutos de pausa en tiempo real antes de verificar exceso |
| `src/pages/KioscoCheckIn.tsx` | 1190-1240 | En `ejecutarAccionDirecta`: aplicar el mismo recálculo para consistencia |
| `src/pages/KioscoCheckIn.tsx` | - | Agregar logs más detallados para debugging |

---

### Lógica del Recálculo

```text
Al ejecutar pausa_fin:
1. Obtener el último fichaje pausa_inicio del día para el empleado
2. Obtener duracion_pausa_minutos del turno activo (default: 30)
3. Calcular minutosTranscurridos = (ahora - pausa_inicio) / 60000
4. Si minutosTranscurridos > minutosPermitidos:
   a. Registrar cruz roja en empleado_cruces_rojas
   b. Mostrar PausaExcedidaAlert
   c. Después del alert, mostrar tareas pendientes si hay
5. Si no excedió:
   a. Continuar flujo normal (mostrar tareas o resetear)
```

---

### Resultado Esperado

Después de implementar:
- Cuando un empleado finalice una pausa que excedió el tiempo permitido, **siempre** verá la alerta de pausa excedida
- La cruz roja se registrará correctamente en la base de datos
- El flujo continuará mostrando tareas pendientes después del alert
- Funcionará correctamente tanto en tablets como en otros dispositivos

---

### Notas Técnicas

- El recálculo se hace directamente en la función de procesamiento para evitar problemas de estado asíncrono
- Se mantiene compatibilidad con el flujo existente de reconocimiento facial y selección de acción
- Los logs ayudarán a diagnosticar si el problema persiste en el futuro
