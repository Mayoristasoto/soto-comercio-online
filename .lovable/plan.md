

## Resumen del Diagnóstico

He verificado exhaustivamente la lógica de alertas y cruces rojas en el kiosco. Encontré lo siguiente:

### Estado Actual de la Lógica

**1. Llegada Tarde (entrada)**
- Se verifica correctamente cuando `tipoAccion === 'entrada'`
- Usa `alertasHabilitadas` que considera el estado de carga del config
- Obtiene el turno del empleado desde `empleado_turnos`
- Calcula `horaLimite = horaEntrada + tolerancia`
- Si llega tarde: muestra alerta + registra cruz roja via RPC `kiosk_registrar_cruz_roja`

**2. Pausa Excedida (pausa_fin)**
- Se verifica cuando `tipoAccion === 'pausa_fin'`
- Llama a `calcularPausaExcedidaEnTiempoReal()` que usa el nuevo RPC `kiosk_get_pausa_inicio`
- Si la pausa excede los minutos permitidos: muestra alerta + registra cruz roja

### El Problema Identificado

El RPC `kiosk_get_pausa_inicio` **funciona correctamente** cuando se ejecuta desde SQL directo, pero el cliente del kiosco recibe un array vacío. Esto causa que `pausaInicio` sea `null` y la verificación de pausa excedida siempre falle.

**Causa probable**: El código genera `startOfDayUtc` de forma correcta, pero hay una inconsistencia entre el formato que espera el RPC y lo que envía el cliente JavaScript. Específicamente, el log muestra `startOfDayUtc: 2026-02-05T03:00:00.000Z` pero cuando se pasa al RPC, PostgreSQL podría no estar parseando correctamente el ISO string como `TIMESTAMPTZ`.

---

## Solución Propuesta

### 1. Mejorar el RPC para ser más robusto con el parsing de fecha

Modificar la función para aceptar `TEXT` y hacer cast explícito, lo cual es más robusto cuando viene desde JavaScript:

```sql
CREATE OR REPLACE FUNCTION kiosk_get_pausa_inicio(
  p_empleado_id UUID,
  p_desde TEXT  -- Cambiar de TIMESTAMPTZ a TEXT para mejor compatibilidad
)
RETURNS TABLE (
  id UUID,
  timestamp_real TIMESTAMPTZ
)
...
  WHERE f.timestamp_real >= p_desde::timestamptz  -- Cast explícito
```

### 2. Agregar logging más detallado para debug

Antes de que `pausaData` sea usado, loguear su valor exacto (tipo y contenido) para identificar si viene como null, array vacío, u otra cosa.

### 3. Agregar fallback para el caso de array vacío

Si el RPC retorna array vacío pero sabemos que debería haber datos, hacer una query alternativa usando el cliente autenticado del kiosco (si hay sesión) o loguear un error más específico.

---

## Cambios a Implementar

### Archivo: Nueva migración SQL
- Actualizar `kiosk_get_pausa_inicio` para usar `TEXT` en lugar de `TIMESTAMPTZ`
- Agregar cast explícito `::timestamptz`

### Archivo: `src/pages/KioscoCheckIn.tsx`
- Mejorar logging para mostrar el tipo de `pausaData` (`Array.isArray`, `typeof`, `length`)
- Agregar manejo para cuando el RPC retorna algo inesperado

---

## Archivos que se modificarán
1. Nueva migración SQL para actualizar el RPC
2. `src/pages/KioscoCheckIn.tsx` - mejorar logging y manejo de respuesta del RPC

