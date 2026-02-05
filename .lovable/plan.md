

## Diagnóstico

**Problema confirmado**: El código obtiene `minutosPermitidos: 30` (fallback) en lugar de `1` (valor real) porque:

1. La consulta a `empleado_turnos` se hace desde sesión anónima (kiosco sin login)
2. RLS bloquea el acceso a `empleado_turnos` para rol `anon`
3. El resultado es `turnoData = null`, entonces cae al fallback `|| 30`

**Evidencia**:
- Query directa a la BD: `duracion_pausa_minutos: 1` para Gonzalo Justiniano
- En consola del kiosco: `minutosPermitidos: 30`
- No existe RPC de kiosco para obtener minutos de turno

---

## Solución

Crear un nuevo RPC `kiosk_get_minutos_pausa` con `SECURITY DEFINER` que:
1. Reciba el `empleado_id`
2. Retorne los minutos de pausa permitidos desde el turno activo
3. Si no hay turno, retorne un default (por ejemplo 30)

---

## Cambios a implementar

### A) Nueva migración SQL

Crear la función RPC:

```sql
CREATE OR REPLACE FUNCTION public.kiosk_get_minutos_pausa(p_empleado_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutos INTEGER;
BEGIN
  SELECT ft.duracion_pausa_minutos INTO v_minutos
  FROM empleado_turnos et
  JOIN fichado_turnos ft ON ft.id = et.turno_id
  WHERE et.empleado_id = p_empleado_id
    AND et.activo = true
  LIMIT 1;
  
  RETURN COALESCE(v_minutos, 30);
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_minutos_pausa(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.kiosk_get_minutos_pausa(UUID) TO authenticated;
```

### B) Actualizar KioscoCheckIn.tsx

En `calcularPausaExcedidaEnTiempoReal`, reemplazar:

```typescript
// ANTES (líneas 465-474):
const { data: turnoData, error: turnoError } = await supabase
  .from('empleado_turnos')
  .select('turno:fichado_turnos(duracion_pausa_minutos)')
  .eq('empleado_id', empleadoId)
  .eq('activo', true)
  .maybeSingle()

const minutosPermitidos = (turnoData?.turno as any)?.duracion_pausa_minutos || 30

// DESPUÉS:
const { data: minutosData, error: minutosError } = await supabase.rpc('kiosk_get_minutos_pausa', {
  p_empleado_id: empleadoId
})

console.log('🔍 [PAUSA REAL-TIME] RPC kiosk_get_minutos_pausa:', minutosData, 'error:', minutosError)

const minutosPermitidos = typeof minutosData === 'number' ? minutosData : 30
```

También hay que actualizar `verificarPausaActiva` (líneas ~536-538) que tiene el mismo problema.

---

## Archivos a modificar

1. **Nueva migración SQL** - crear RPC `kiosk_get_minutos_pausa`
2. **src/pages/KioscoCheckIn.tsx** - usar el nuevo RPC en:
   - `calcularPausaExcedidaEnTiempoReal` (~línea 465)
   - `verificarPausaActiva` (~línea 536)

---

## Resultado esperado

- El kiosco obtendrá correctamente `minutosPermitidos: 1` para Gonzalo Justiniano
- Las alertas de "Pausa Excedida" se dispararán correctamente cuando corresponda
- Se registrarán las cruces rojas de pausa excedida

