
# Plan: Corregir Alerta de Pausa Excedida en Kiosco

## Problema Identificado

Después de analizar el código y la base de datos, encontré los dos problemas reales:

### Problema 1: RLS bloquea el insert de cruz roja

El kiosco funciona **sin sesión autenticada** (anónimo). Cuando el código intenta insertar en `empleado_cruces_rojas`:

```javascript
const { error: cruceError } = await supabase.from('empleado_cruces_rojas').insert({...})
```

La tabla tiene RLS habilitado y las políticas probablemente requieren autenticación, causando un fallo silencioso.

### Problema 2: La alerta depende del resultado del insert

El código actual setea `registradoExitoso = true` solo si el insert no da error. Pero el estado de la alerta (`showPausaExcedidaAlert`) se setea **después** de intentar registrar, y si el insert falla por RLS, el flujo podría no mostrar la alerta correctamente.

---

## Solución Propuesta

### Cambio 1: Crear función RPC SECURITY DEFINER para insertar cruz roja

Crear una función RPC que permita insertar cruces rojas desde el kiosco sin requerir autenticación (similar a `kiosk_insert_fichaje`):

```sql
CREATE OR REPLACE FUNCTION public.kiosk_registrar_cruz_roja(
  p_empleado_id UUID,
  p_tipo_infraccion TEXT,
  p_fichaje_id UUID DEFAULT NULL,
  p_minutos_diferencia INTEGER DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO empleado_cruces_rojas (
    empleado_id,
    tipo_infraccion,
    fecha_infraccion,
    fichaje_id,
    minutos_diferencia,
    observaciones
  ) VALUES (
    p_empleado_id,
    p_tipo_infraccion,
    CURRENT_DATE,
    p_fichaje_id,
    p_minutos_diferencia,
    p_observaciones
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_registrar_cruz_roja TO anon, authenticated;
```

### Cambio 2: Actualizar el código del kiosco para usar la RPC

En `src/pages/KioscoCheckIn.tsx`, reemplazar los inserts directos por llamadas a la RPC:

**Antes:**
```javascript
const { error: cruceError } = await supabase.from('empleado_cruces_rojas').insert({
  empleado_id: empleadoParaFichaje.id,
  tipo_infraccion: 'pausa_excedida',
  ...
})
```

**Después:**
```javascript
const { data: cruceId, error: cruceError } = await supabase.rpc('kiosk_registrar_cruz_roja', {
  p_empleado_id: empleadoParaFichaje.id,
  p_tipo_infraccion: 'pausa_excedida',
  p_fichaje_id: fichajeId,
  p_minutos_diferencia: minutosExceso,
  p_observaciones: `Pausa excedida: ${pausaRealTime.minutosTranscurridos} min usados de ${pausaRealTime.minutosPermitidos} min permitidos`
})
```

### Cambio 3: Garantizar que la alerta se muestre independientemente del insert

Separar la lógica de mostrar la alerta del resultado del registro:

```javascript
if (pausaRealTime?.excedida) {
  // 1. PRIMERO mostrar la alerta (garantizado)
  setPausaExcedidaInfo({
    minutosUsados: pausaRealTime.minutosTranscurridos,
    minutosPermitidos: pausaRealTime.minutosPermitidos,
    registrado: false // Se actualizará después
  })
  setShowPausaExcedidaAlert(true)
  
  // 2. DESPUÉS intentar registrar la cruz roja
  try {
    const { error } = await supabase.rpc('kiosk_registrar_cruz_roja', {...})
    if (!error) {
      setPausaExcedidaInfo(prev => prev ? {...prev, registrado: true} : null)
    }
  } catch (err) {
    console.error('Error registrando cruz roja:', err)
  }
  
  return // Salir del flujo para mostrar alerta
}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Crear función `kiosk_registrar_cruz_roja` con SECURITY DEFINER |
| `src/pages/KioscoCheckIn.tsx` | Usar RPC en lugar de insert directo (4 ubicaciones) |
| `src/pages/KioscoCheckIn.tsx` | Garantizar que la alerta se muestre primero, antes del insert |

---

## Detalles Técnicos

### Ubicaciones del cambio en KioscoCheckIn.tsx:

1. **Línea ~1270**: `ejecutarAccionDirecta` - pausa_excedida
2. **Línea ~1525**: `ejecutarAccionDirecta` - llegada_tarde  
3. **Línea ~1604**: `procesarAccionFichaje` - pausa_excedida
4. **Línea ~1199**: `ejecutarAccionDirecta` - llegada_tarde

### Por qué esto resuelve el problema:

- La función RPC con `SECURITY DEFINER` se ejecuta con permisos elevados, evitando RLS
- Permisos `anon` permiten al kiosco sin sesión ejecutar la función
- La alerta se muestra primero, garantizando que el usuario la vea
- El registro de la cruz roja se intenta después, sin bloquear la alerta

---

## Resultado Esperado

Después de implementar:
- La alerta de pausa excedida **SIEMPRE** se mostrará cuando corresponda
- La cruz roja se registrará correctamente en el legajo del empleado
- El sistema funcionará tanto en tablets como en otros dispositivos
- No dependerá de tener una sesión autenticada
