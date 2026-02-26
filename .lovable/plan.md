

## Problem

The novedades check (`kiosk_get_novedades`) only exists in `procesarFichaje` (facial recognition flow, line ~861). The `handlePinSuccess` function (PIN flow, line ~1891) skips novedades entirely and goes straight to tareas at step 7 (line ~2074).

The database is correct — the RPC returns the novedad for Gonzalo Justiniano. The bug is purely frontend: the PIN check-in path never calls the novedades RPC.

## Fix

Add novedades fetch to `handlePinSuccess` in `KioscoCheckIn.tsx`, between step 6 (pausa excedida check, ends ~line 2071) and step 7 (audio + tareas, line ~2073):

```typescript
// 6.5 Fetch novedades (only on entrada)
if (tipoAccion === 'entrada') {
  try {
    const { data: novedadesData } = await (supabase.rpc as any)('kiosk_get_novedades', {
      p_empleado_id: empleadoId,
    })
    if (novedadesData && novedadesData.length > 0) {
      setNovedadesPendientes(novedadesData)
      setShowNovedadesAlert(true)
      return // Flow continues when alert is dismissed
    }
  } catch (err) {
    console.error('[PIN] Error fetching novedades:', err)
  }
}
```

Single file change: `src/pages/KioscoCheckIn.tsx`, insert ~12 lines after line 2071.

