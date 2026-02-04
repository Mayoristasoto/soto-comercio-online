

# Plan: Solucionar Problema de Alerta y Cruz Roja para Pausas Excedidas

## Problema Detectado

Gonzalo Justiniano fichó fin de descanso el 4 de febrero a las 15:09 (hora Argentina) después de 4.5 minutos de pausa, cuando solo tenía 1 minuto permitido. 

### Lo que funcionó:
- El fichaje se registró correctamente
- El trigger de base de datos detectó la pausa excedida y la guardó en `fichajes_pausas_excedidas`

### Lo que no funcionó:
- No apareció la alerta visual (PausaExcedidaAlert)
- No se registró cruz roja en `empleado_cruces_rojas`

## Causa Raíz

El sistema tiene **dos mecanismos paralelos** para detectar pausas excedidas:

1. **Trigger de base de datos**: Funciona correctamente, guarda en `fichajes_pausas_excedidas`
2. **Código del frontend**: Debería mostrar alerta y llamar RPC `kiosk_registrar_cruz_roja`, pero no se ejecutó

El problema está en que el código del frontend que muestra la alerta está en `KioscoCheckIn.tsx`, y parece que no se ejecutó correctamente. Las posibles causas son:

- El código con logging que acabamos de aprobar aún no estaba desplegado
- La función `calcularPausaExcedidaEnTiempoReal` retornó null (problema de zona horaria)
- Un error silencioso previno la ejecución

## Solución Propuesta

### Parte 1: Agregar Logging Adicional para Diagnóstico Completo

Agregar más puntos de logging para capturar absolutamente todos los escenarios, incluyendo cuando la función retorna null.

### Parte 2: Corregir Posible Problema de Zona Horaria

En la función `calcularPausaExcedidaEnTiempoReal`, el cálculo de tiempo usa:
- `inicioPausa` del servidor (UTC)
- `ahora` del dispositivo (zona horaria local)

Esto puede causar cálculos incorrectos si el dispositivo no está en Argentina.

### Parte 3: Sincronizar los Dos Sistemas

Actualmente hay redundancia entre:
- `fichajes_pausas_excedidas` (trigger de BD)
- `empleado_cruces_rojas` (RPC del frontend)

Se debe garantizar que ambos sistemas registren la infracción, o unificarlos.

---

## Cambios Técnicos

### Archivo: `src/pages/KioscoCheckIn.tsx`

#### Cambio 1: Mejorar logging cuando `calcularPausaExcedidaEnTiempoReal` retorna null

```typescript
// Línea ~1353-1356
} else {
  console.error('⚠️ [PAUSA REAL-TIME] No se pudo calcular pausa en tiempo real')
  console.error('⚠️ [PAUSA REAL-TIME] empleadoId:', empleadoParaFichaje.id)
  console.error('⚠️ [PAUSA REAL-TIME] Esto indica que no se encontró pausa_inicio del día')
  logCruzRoja.fin('pausa_excedida', 'error')
}
```

#### Cambio 2: Corregir cálculo de zona horaria

```typescript
// Línea ~437-440 en calcularPausaExcedidaEnTiempoReal
// ANTES (potencialmente problemático):
const ahora = new Date()
const minutosTranscurridos = Math.floor((ahora.getTime() - inicioPausa.getTime()) / 60000)

// DESPUÉS (usar hora UTC consistente):
const ahoraUtc = new Date()
const inicioPausaUtc = new Date(pausaInicio.timestamp_real)
const minutosTranscurridos = Math.floor((ahoraUtc.getTime() - inicioPausaUtc.getTime()) / 60000)

console.log('🔍 [PAUSA REAL-TIME] Cálculo detallado:', {
  empleadoId,
  inicioPausaUtc: inicioPausaUtc.toISOString(),
  ahoraUtc: ahoraUtc.toISOString(),
  diferenciaMs: ahoraUtc.getTime() - inicioPausaUtc.getTime(),
  minutosTranscurridos,
  minutosPermitidos,
  excedida: minutosTranscurridos > minutosPermitidos
})
```

#### Cambio 3: Agregar verificación de que el fichaje fue guardado antes de verificar pausa

El problema podría ser que el fichaje de `pausa_fin` aún no está en la base de datos cuando se ejecuta `calcularPausaExcedidaEnTiempoReal`. Agregar un pequeño delay o verificación.

---

## Verificación Inmediata

Para confirmar que el sistema funcionará correctamente en el próximo fichaje:

1. Realizar un fichaje de prueba de `pausa_inicio` seguido de `pausa_fin` después de esperar más del tiempo permitido
2. Verificar en la consola del navegador que aparezcan los logs:
   - `🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] === INICIO VERIFICACIÓN ===`
   - `🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] === CÁLCULO ===`
   - `🔍 [CRUZ-ROJA:PAUSA_EXCEDIDA] === LLAMANDO RPC ===`
   - `✅ [CRUZ-ROJA:PAUSA_EXCEDIDA] === FIN VERIFICACIÓN (exito) ===`

3. Verificar que la alerta visual aparezca
4. Verificar que se cree registro en `empleado_cruces_rojas`

---

## Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/KioscoCheckIn.tsx` | Mejorar logging cuando calcularPausaExcedidaEnTiempoReal retorna null |
| `src/pages/KioscoCheckIn.tsx` | Agregar logging detallado del cálculo de tiempo |
| `src/lib/crucesRojasLogger.ts` | Agregar función para loguear cuando no hay pausa_inicio |

