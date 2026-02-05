
## Plan: Mostrar tiempo de pausa transcurrido en el Kiosco

### Problema identificado
La información de pausa **ya está implementada** en la UI (líneas 2317-2382 de KioscoCheckIn.tsx), pero **no se muestra** porque la sesión anónima del kiosco no puede leer de la tabla `fichajes` debido a RLS.

**Evidencia:** La tabla `fichajes` permite `INSERT` para `anon` pero **no tiene política SELECT para `anon`**:
- `Kiosk can insert fichajes` → INSERT permitido
- No hay política SELECT para anon → lectura bloqueada

### Solución
Crear un RPC con `SECURITY DEFINER` que permita al kiosco consultar si hay pausa activa:

### Cambios a implementar

**1. Nueva migración SQL - RPC `kiosk_get_pausa_activa`**

```sql
CREATE OR REPLACE FUNCTION public.kiosk_get_pausa_activa(p_empleado_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pausa_inicio TIMESTAMPTZ;
  v_minutos_permitidos INTEGER;
  v_start_of_day TIMESTAMPTZ;
BEGIN
  -- Calcular inicio del día en Argentina (UTC-3)
  v_start_of_day := date_trunc('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') 
                    AT TIME ZONE 'America/Argentina/Buenos_Aires';
  
  -- Buscar último pausa_inicio de hoy que NO tenga pausa_fin posterior
  SELECT f.timestamp_real INTO v_pausa_inicio
  FROM fichajes f
  WHERE f.empleado_id = p_empleado_id
    AND f.tipo = 'pausa_inicio'
    AND f.timestamp_real >= v_start_of_day
    AND NOT EXISTS (
      SELECT 1 FROM fichajes f2 
      WHERE f2.empleado_id = p_empleado_id 
        AND f2.tipo = 'pausa_fin'
        AND f2.timestamp_real > f.timestamp_real
    )
  ORDER BY f.timestamp_real DESC
  LIMIT 1;
  
  IF v_pausa_inicio IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obtener minutos permitidos del turno
  SELECT COALESCE(ft.minutos_pausa, 30) INTO v_minutos_permitidos
  FROM empleado_turnos et
  JOIN fichado_turnos ft ON ft.id = et.turno_id
  WHERE et.empleado_id = p_empleado_id
    AND et.activo = true
    AND et.fecha_inicio <= CURRENT_DATE
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE)
  LIMIT 1;
  
  v_minutos_permitidos := COALESCE(v_minutos_permitidos, 30);
  
  RETURN json_build_object(
    'inicio', v_pausa_inicio,
    'minutos_permitidos', v_minutos_permitidos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_activa(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_activa(UUID) TO authenticated;
```

**2. Actualizar `src/pages/KioscoCheckIn.tsx`**

Modificar la función `verificarPausaActiva` para usar el nuevo RPC:

```typescript
const verificarPausaActiva = async (empleadoId: string) => {
  try {
    const { data, error } = await supabase.rpc('kiosk_get_pausa_activa', {
      p_empleado_id: empleadoId
    }) as { data: { inicio: string; minutos_permitidos: number } | null; error: any };
    
    if (error || !data) {
      console.log('🔍 [DEBUG PAUSA] No hay pausa activa:', error);
      setPausaActiva(null);
      return;
    }
    
    const inicioPausa = new Date(data.inicio);
    const minutosPermitidos = data.minutos_permitidos;
    const ahora = new Date();
    const minutosTranscurridos = Math.floor((ahora.getTime() - inicioPausa.getTime()) / 60000);
    const minutosRestantes = minutosPermitidos - minutosTranscurridos;
    const excedida = minutosTranscurridos > minutosPermitidos;
    
    console.log('🔍 [DEBUG PAUSA] verificarPausaActiva resultado:', {
      empleadoId,
      inicioPausa: inicioPausa.toISOString(),
      minutosPermitidos,
      minutosTranscurridos,
      minutosRestantes,
      excedida
    });
    
    setPausaActiva({
      inicio: inicioPausa,
      minutosPermitidos,
      minutosTranscurridos,
      minutosRestantes,
      excedida
    });
    
  } catch (error) {
    console.error('Error verificando pausa activa:', error);
    setPausaActiva(null);
  }
};
```

### Resultado esperado
- Cuando Gonzalo Justiniano (u otro empleado con pausa activa) haga check-in facial
- Se mostrará la tarjeta con información de pausa mostrando:
  - Tiempo transcurrido en minutos
  - Tiempo permitido
  - Exceso (si aplica)
  - Hora de inicio de la pausa
  - Mensaje de advertencia si está excedida

### Archivos a modificar
1. Nueva migración SQL para crear `kiosk_get_pausa_activa`
2. `src/pages/KioscoCheckIn.tsx` - actualizar `verificarPausaActiva` para usar RPC
