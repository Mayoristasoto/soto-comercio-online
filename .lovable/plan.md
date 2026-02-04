

# Plan: Solucionar Problema de Alerta y Cruz Roja para Pausas Excedidas

## ✅ IMPLEMENTADO

### Cambios realizados:

1. **Mejorado logging en `calcularPausaExcedidaEnTiempoReal`**:
   - Log de inicio con empleadoId
   - Log del startOfDayUtc usado para filtrar
   - Logs detallados cuando no se encuentra pausa_inicio (posibles causas)
   - Logs del cálculo de tiempo con valores UTC explícitos
   - Log de excepciones con stack trace

2. **Mejorado logging cuando retorna null** (en ambas funciones):
   - `ejecutarAccionDirecta`: línea ~1353
   - `procesarAccionFichaje`: línea ~1734

3. **Agregada función `sinPausaInicio` al logger centralizado**

## Cómo usar para diagnóstico:

1. Abrir consola del navegador en el kiosco
2. Hacer fichaje de `pausa_fin`
3. Buscar logs con prefijo `🔍 [PAUSA REAL-TIME]`
4. Revisar:
   - `=== INICIO calcularPausaExcedidaEnTiempoReal ===`
   - `Buscando pausa_inicio desde: [startOfDayUtc]`
   - `Resultado búsqueda pausa_inicio: [data]`
   - `=== CÁLCULO DETALLADO ===` con todos los valores

## Próximos pasos si falla:

Si los logs muestran "No se encontró pausa_inicio", verificar:
1. Que el `startOfDayUtc` esté en Argentina (debería ser algo como `2026-02-04T03:00:00.000Z`)
2. Que el empleado efectivamente tenga fichaje de `pausa_inicio` ese día
