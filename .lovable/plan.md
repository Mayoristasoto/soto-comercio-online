
# Plan: Agregar Alertas de Pausa Excedida y Llegada Tarde en Fichero (Celular)

## Problema Identificado

Gonzalo Justiniano fichó "fin de descanso" desde su **celular** usando la página `/fichero` (no el kiosco). El sistema tiene dos módulos separados para fichaje:

1. **`/kiosco` (`KioscoCheckIn.tsx`)**: Tiene alertas visuales y registro de cruces rojas implementado
2. **`/fichero` (`Fichero.tsx`)**: NO tiene alertas ni registro de cruces rojas

El trigger de base de datos **sí detectó** la pausa excedida (hay registros en `fichajes_pausas_excedidas` del 4 de febrero con 4 y 23 minutos de exceso), pero como el código de alertas solo existe en el kiosco, Gonzalo no vio ninguna alerta y no se registró cruz roja en `empleado_cruces_rojas`.

## Solución Propuesta

Implementar el mismo flujo de verificación de infracciones en `Fichero.tsx` que ya existe en `KioscoCheckIn.tsx`:

### Cambios en `src/pages/Fichero.tsx`

#### 1. Agregar imports necesarios

```typescript
import { PausaExcedidaAlert } from "@/components/kiosko/PausaExcedidaAlert"
import { LlegadaTardeAlert } from "@/components/kiosko/LlegadaTardeAlert"
import { logCruzRoja } from "@/lib/crucesRojasLogger"
import { useFacialConfig } from "@/hooks/useFacialConfig"
import { toArgentinaTime, getArgentinaStartOfDay } from "@/lib/dateUtils"
```

#### 2. Agregar estados para alertas

```typescript
const [showPausaExcedidaAlert, setShowPausaExcedidaAlert] = useState(false)
const [pausaExcedidaInfo, setPausaExcedidaInfo] = useState<{
  minutosUsados: number
  minutosPermitidos: number
  registrado: boolean
} | null>(null)

const [showLlegadaTardeAlert, setShowLlegadaTardeAlert] = useState(false)
const [llegadaTardeInfo, setLlegadaTardeInfo] = useState<{
  horaEntradaProgramada: string
  horaLlegadaReal: string
  minutosRetraso: number
  toleranciaMinutos: number
  registrado: boolean
} | null>(null)
```

#### 3. Agregar función de cálculo de pausa excedida

Copiar la función `calcularPausaExcedidaEnTiempoReal` desde `KioscoCheckIn.tsx`.

#### 4. Modificar `procesarFichaje` para verificar infracciones

Después del fichaje exitoso, agregar verificación de:
- **Llegada tarde** (si `tipoFichaje === 'entrada'`)
- **Pausa excedida** (si `tipoFichaje === 'pausa_fin'`)

#### 5. Agregar componentes de alerta en el render

```tsx
{showPausaExcedidaAlert && pausaExcedidaInfo && empleado && (
  <PausaExcedidaAlert
    empleadoNombre={`${empleado.nombre} ${empleado.apellido}`}
    minutosUsados={pausaExcedidaInfo.minutosUsados}
    minutosPermitidos={pausaExcedidaInfo.minutosPermitidos}
    registrado={pausaExcedidaInfo.registrado}
    onDismiss={() => {
      setShowPausaExcedidaAlert(false)
      setPausaExcedidaInfo(null)
    }}
  />
)}

{showLlegadaTardeAlert && llegadaTardeInfo && empleado && (
  <LlegadaTardeAlert
    empleadoNombre={`${empleado.nombre} ${empleado.apellido}`}
    horaEntradaProgramada={llegadaTardeInfo.horaEntradaProgramada}
    horaLlegadaReal={llegadaTardeInfo.horaLlegadaReal}
    minutosRetraso={llegadaTardeInfo.minutosRetraso}
    toleranciaMinutos={llegadaTardeInfo.toleranciaMinutos}
    registrado={llegadaTardeInfo.registrado}
    onDismiss={() => {
      setShowLlegadaTardeAlert(false)
      setLlegadaTardeInfo(null)
    }}
  />
)}
```

---

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `src/pages/Fichero.tsx` | Agregar imports, estados, función de cálculo de pausa, verificación de infracciones en `procesarFichaje`, componentes de alerta |

---

## Sección Técnica

### Lógica de verificación de pausa excedida (a agregar después de línea 305)

```typescript
// Después del fichaje exitoso, verificar infracciones
if (tipoFichaje === 'pausa_fin' && empleado.id !== 'demo-empleado') {
  logCruzRoja.inicio('pausa_excedida', empleado.id, fichajeId, true)
  
  const pausaRealTime = await calcularPausaExcedidaEnTiempoReal(empleado.id)
  
  if (pausaRealTime && pausaRealTime.excedida) {
    const minutosExceso = Math.round(pausaRealTime.minutosTranscurridos - pausaRealTime.minutosPermitidos)
    
    // Mostrar alerta
    setPausaExcedidaInfo({
      minutosUsados: pausaRealTime.minutosTranscurridos,
      minutosPermitidos: pausaRealTime.minutosPermitidos,
      registrado: false
    })
    setShowPausaExcedidaAlert(true)
    
    // Registrar cruz roja
    const { data, error } = await supabase.rpc('kiosk_registrar_cruz_roja', {
      p_empleado_id: empleado.id,
      p_tipo_infraccion: 'pausa_excedida',
      p_fichaje_id: fichajeId,
      p_minutos_diferencia: minutosExceso,
      p_observaciones: `Pausa excedida (fichero móvil): ${pausaRealTime.minutosTranscurridos} min usados de ${pausaRealTime.minutosPermitidos} min permitidos`
    })
    
    if (!error) {
      setPausaExcedidaInfo(prev => prev ? {...prev, registrado: true} : null)
      logCruzRoja.fin('pausa_excedida', 'exito')
    }
  }
}
```

### Lógica de verificación de llegada tarde (similar, verificar turno y hora)

Se aplicará el mismo patrón que en KioscoCheckIn.tsx, consultando el turno del empleado y comparando con la hora actual.

### Cómo usar los logs después de implementar

1. Abrir consola del navegador en el celular
2. Realizar fichaje de `pausa_fin` o `entrada`
3. Buscar logs con prefijo `[CRUZ-ROJA:PAUSA_EXCEDIDA]` o `[CRUZ-ROJA:LLEGADA_TARDE]`
