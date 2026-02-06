

## Hacer GPS obligatorio en el kiosco de fichaje

### Problema actual
El kiosco tiene 3 funciones de fichaje que obtienen GPS de forma opcional. Si el GPS falla o el usuario deniega el permiso, el fichaje continua sin coordenadas ("Sin GPS").

### Solucion
Cambiar el comportamiento en las 3 funciones de fichaje para que:
1. Si el GPS no esta disponible o es denegado, se muestre un error y se bloquee el fichaje
2. Aumentar el timeout de GPS de 5s a 10s y activar `enableHighAccuracy: true`
3. Extraer la logica GPS duplicada a una funcion reutilizable

### Cambios tecnicos

**Archivo: `src/pages/KioscoCheckIn.tsx`**

1. **Crear funcion helper `obtenerUbicacionObligatoria`** al inicio del componente que:
   - Solicita GPS con `enableHighAccuracy: true` y timeout de 10 segundos
   - Si el permiso esta denegado, muestra un toast de error: "Debe habilitar la ubicacion GPS para poder fichar"
   - Si hay timeout u otro error, muestra toast: "No se pudo obtener la ubicacion GPS. Intente de nuevo"
   - Retorna `null` si falla (indicando que no se debe continuar)
   - Retorna `{ latitud, longitud }` si tiene exito

2. **Modificar las 3 funciones de fichaje** (lineas ~730, ~1194, ~1531):
   - Reemplazar el bloque try/catch de GPS opcional por una llamada a `obtenerUbicacionObligatoria()`
   - Si retorna `null`, hacer `setLoading(false); return` para cancelar el fichaje
   - Eliminar el fallback a `null` en `p_lat` y `p_lng`

3. **Mensaje de error claro** para el usuario del kiosco:
   - Toast con variant `destructive`
   - Titulo: "Ubicacion GPS requerida"
   - Descripcion: "Debe permitir el acceso a la ubicacion para registrar la fichada. Verifique los permisos del navegador."

### Resultado esperado
- Si GPS funciona: fichaje normal con coordenadas
- Si GPS denegado/falla: fichaje bloqueado con mensaje claro indicando que debe habilitar GPS

