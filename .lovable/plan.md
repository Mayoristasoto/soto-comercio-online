

# Plan: Agregar Logging Detallado para Diagnóstico de Cruces Rojas

## Problema Identificado

Al analizar los datos:
- **Matias Merino y Carlos Espina** tienen fichajes del 3 y 4 de febrero con `es_puntual: false` correctamente guardado
- **Sin embargo, NO existen registros en `empleado_cruces_rojas`** para esas fechas
- El RPC `kiosk_registrar_cruz_roja` existe y funciona (tiene `SECURITY DEFINER = true`)
- La configuración `late_arrival_alert_enabled` está en `true`

Esto indica que:
1. El fichaje sí detecta la llegada tarde (guarda `es_puntual: false`)
2. Pero el código que llama al RPC para registrar la cruz roja **no se está ejecutando** o **falla silenciosamente**

## Áreas Críticas a Agregar Logging

### 1. Flujo de Llegada Tarde (líneas 1174-1241 y 1500-1567)

Hay **dos funciones** donde se detecta llegada tarde:
- `ejecutarAccionDirecta` (reconocimiento facial directo)
- `procesarAccionFichaje` (selección manual de acción)

Puntos a loguear:
- Entrada al bloque de verificación de llegada tarde
- Valor de `config.lateArrivalAlertEnabled`
- Datos del turno obtenido
- Cálculo de hora límite vs hora actual
- Resultado de la comparación
- Llamada al RPC y su resultado

### 2. Flujo de Pausa Excedida (líneas 1258-1308 y 1591-1650)

Similar al anterior, en ambas funciones hay bloques de pausa excedida.

## Cambios Propuestos

### Archivo: `src/pages/KioscoCheckIn.tsx`

#### Sección 1: Logging en `ejecutarAccionDirecta` - Llegada Tarde (líneas ~1174-1241)

```typescript
// 🔔 Verificar si llegó tarde y mostrar alerta (solo si está habilitado)
if (tipoAccion === 'entrada' && config.lateArrivalAlertEnabled) {
  console.log('🔍 [LLEGADA-TARDE] === INICIO VERIFICACIÓN ===')
  console.log('🔍 [LLEGADA-TARDE] config.lateArrivalAlertEnabled:', config.lateArrivalAlertEnabled)
  console.log('🔍 [LLEGADA-TARDE] empleadoId:', empleadoParaFichaje.id)
  console.log('🔍 [LLEGADA-TARDE] fichajeId:', fichajeId)
  
  try {
    const { data: turnoData, error: turnoError } = await supabase
      .from('empleado_turnos')
      .select('turno:fichado_turnos(hora_entrada, tolerancia_entrada_minutos)')
      .eq('empleado_id', empleadoParaFichaje.id)
      .eq('activo', true)
      .maybeSingle()
    
    console.log('🔍 [LLEGADA-TARDE] turnoData:', turnoData)
    console.log('🔍 [LLEGADA-TARDE] turnoError:', turnoError)
    
    if (turnoData?.turno) {
      const turno = turnoData.turno as { hora_entrada: string; tolerancia_entrada_minutos: number | null }
      const horaEntradaProgramada = turno.hora_entrada
      const tolerancia = turno.tolerancia_entrada_minutos ?? 5
      
      const [h, m] = horaEntradaProgramada.split(':').map(Number)
      const horaLimite = new Date()
      horaLimite.setHours(h, m + tolerancia, 0, 0)
      
      const horaActual = new Date()
      
      console.log('🔍 [LLEGADA-TARDE] horaEntradaProgramada:', horaEntradaProgramada)
      console.log('🔍 [LLEGADA-TARDE] tolerancia:', tolerancia)
      console.log('🔍 [LLEGADA-TARDE] horaLimite:', horaLimite.toISOString())
      console.log('🔍 [LLEGADA-TARDE] horaActual:', horaActual.toISOString())
      console.log('🔍 [LLEGADA-TARDE] ¿Llegó tarde?:', horaActual > horaLimite)
      
      if (horaActual > horaLimite) {
        const minutosRetraso = Math.round((horaActual.getTime() - horaLimite.getTime()) / 60000)
        console.log('🔍 [LLEGADA-TARDE] minutosRetraso:', minutosRetraso)
        
        // ... mostrar alerta ...
        
        // DESPUÉS: Registrar cruz roja
        console.log('🔍 [LLEGADA-TARDE] Llamando RPC kiosk_registrar_cruz_roja...')
        console.log('🔍 [LLEGADA-TARDE] Parámetros:', {
          p_empleado_id: empleadoParaFichaje.id,
          p_tipo_infraccion: 'llegada_tarde',
          p_fichaje_id: fichajeId,
          p_minutos_diferencia: minutosRetraso
        })
        
        try {
          const { data: rpcResult, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', {
            p_empleado_id: empleadoParaFichaje.id,
            p_tipo_infraccion: 'llegada_tarde',
            p_fichaje_id: fichajeId,
            p_minutos_diferencia: minutosRetraso,
            p_observaciones: `...`
          })
          
          console.log('🔍 [LLEGADA-TARDE] RPC resultado:', rpcResult)
          console.log('🔍 [LLEGADA-TARDE] RPC error:', cruceError)
          
          if (!cruceError) {
            console.log('✅ [LLEGADA-TARDE] Cruz roja registrada exitosamente')
          } else {
            console.error('❌ [LLEGADA-TARDE] Error RPC:', JSON.stringify(cruceError))
          }
        } catch (err) {
          console.error('❌ [LLEGADA-TARDE] Excepción al llamar RPC:', err)
        }
      } else {
        console.log('✅ [LLEGADA-TARDE] Empleado llegó a tiempo')
      }
    } else {
      console.log('⚠️ [LLEGADA-TARDE] No se encontró turno activo para el empleado')
    }
  } catch (error) {
    console.error('❌ [LLEGADA-TARDE] Error en verificación:', error)
  }
  console.log('🔍 [LLEGADA-TARDE] === FIN VERIFICACIÓN ===')
}
```

#### Sección 2: Logging en `procesarAccionFichaje` - Llegada Tarde (líneas ~1500-1567)

Mismo patrón de logging aplicado a la segunda función.

#### Sección 3: Logging en Pausa Excedida (líneas ~1258-1308 y ~1591-1650)

Logging similar para el flujo de pausa excedida.

### Archivo: Crear `src/lib/crucesRojasLogger.ts` (Opcional - Centralizado)

Para evitar duplicación de código, crear un logger centralizado:

```typescript
export const logCruzRoja = {
  inicio: (tipo: 'llegada_tarde' | 'pausa_excedida', empleadoId: string, fichajeId: string) => {
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] === INICIO ===`)
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] empleadoId: ${empleadoId}`)
    console.log(`🔍 [CRUZ-ROJA:${tipo.toUpperCase()}] fichajeId: ${fichajeId}`)
  },
  
  turnoData: (data: any, error: any) => {
    console.log('🔍 [CRUZ-ROJA] turnoData:', JSON.stringify(data))
    if (error) console.log('🔍 [CRUZ-ROJA] turnoError:', JSON.stringify(error))
  },
  
  calculo: (params: { horaEsperada?: string, tolerancia?: number, horaLimite?: string, horaActual?: string, esTarde?: boolean, minutos?: number }) => {
    Object.entries(params).forEach(([key, value]) => {
      console.log(`🔍 [CRUZ-ROJA] ${key}: ${value}`)
    })
  },
  
  rpcLlamada: (params: Record<string, any>) => {
    console.log('🔍 [CRUZ-ROJA] Llamando RPC kiosk_registrar_cruz_roja')
    console.log('🔍 [CRUZ-ROJA] Parámetros:', JSON.stringify(params))
  },
  
  rpcResultado: (data: any, error: any) => {
    if (error) {
      console.error('❌ [CRUZ-ROJA] Error RPC:', JSON.stringify(error))
    } else {
      console.log('✅ [CRUZ-ROJA] Registrado exitosamente. ID:', data)
    }
  },
  
  fin: (resultado: 'exito' | 'sin_turno' | 'puntual' | 'error') => {
    console.log(`🔍 [CRUZ-ROJA] === FIN (${resultado}) ===`)
  }
}
```

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/KioscoCheckIn.tsx` | Agregar ~40 líneas de logging en 4 secciones (2 para llegada tarde, 2 para pausa excedida) |
| `src/lib/crucesRojasLogger.ts` | (Opcional) Crear logger centralizado para reutilización |

## Sección Técnica

### Archivos a modificar:
- `src/pages/KioscoCheckIn.tsx` (líneas ~1174-1241, ~1258-1308, ~1500-1567, ~1591-1650)

### Formato de logs:
- Prefijo `🔍 [LLEGADA-TARDE]` para llegadas tarde
- Prefijo `🔍 [PAUSA-EXCEDIDA]` para pausas excedidas  
- Prefijo `✅` para éxitos
- Prefijo `❌` para errores
- Prefijo `⚠️` para advertencias

### Datos a capturar por cada evento:
1. ID del empleado
2. ID del fichaje
3. Estado de configuración (`lateArrivalAlertEnabled`)
4. Datos del turno (hora entrada, tolerancia)
5. Cálculo de hora límite vs hora actual
6. Resultado de comparación
7. Parámetros enviados al RPC
8. Respuesta del RPC (data o error)

### Cómo usar los logs:
1. Abrir la consola del navegador en el iPad
2. Realizar un fichaje de entrada (llegada tarde) o pausa_fin (pausa excedida)
3. Buscar logs con prefijo `[LLEGADA-TARDE]` o `[PAUSA-EXCEDIDA]`
4. Revisar en qué punto falla el flujo

