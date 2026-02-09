

## Corregir: Historial no se actualiza despues de Anotacion Rapida

### Problema
La anotacion rapida guarda correctamente en la base de datos, pero el componente `HistorialAnotaciones` no se refresca automaticamente. El usuario tiene que recargar la pagina manualmente para ver la nueva anotacion.

### Causa
El componente `AnotacionRapida` no tiene ningun callback para notificar a la pagina padre que se creo una nueva anotacion. El `refreshTrigger` que ya existe en `Anotaciones.tsx` solo se actualiza desde `AnotacionesSyncManager`, no desde `AnotacionRapida`.

### Solucion

**Archivo: `src/components/anotaciones/AnotacionRapida.tsx`**
- Agregar una prop `onAnotacionCreada` (callback opcional)
- Llamar a este callback despues de guardar exitosamente

**Archivo: `src/pages/Anotaciones.tsx`**
- Pasar `onAnotacionCreada={() => setRefreshTrigger(prev => prev + 1)}` al componente `AnotacionRapida`
- Esto reutiliza el mecanismo de `refreshTrigger` que ya existe y que `HistorialAnotaciones` ya escucha

### Cambios minimos
Son solo 3 lineas de cambio en total:
1. Agregar la prop al interface de `AnotacionRapida`
2. Llamar `onAnotacionCreada?.()` despues del toast de exito
3. Pasar el callback en `Anotaciones.tsx`

