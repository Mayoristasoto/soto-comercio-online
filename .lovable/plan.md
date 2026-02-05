
## Objetivo (lo que te está rompiendo ahora)
1) El error **“GeolocationPositionError: User denied Geolocation”** no debería:
- spamear consola / toasts como si fuera un fallo del sistema,
- ni bloquear el fichaje.

2) El warning **“guardarFotoVerificacion: fichajeId no proporcionado”** es un bug real:
- Hoy se intenta subir la foto **antes** de tener `fichajeId`, por eso falla siempre en fichaje facial.
- Esto además impide tu objetivo de auditoría/fraude (fotos + GPS + fichajeId).

3) El log **“ℹ️ [CRUZ-ROJA:LLEGADA_TARDE] … config deshabilitada”** en **/kiosco** ocurre porque el kiosco usa `useFacialConfig()` sin contemplar el **estado loading** (arranca en `false` por default y en esos segundos omite la verificación).

---

## Diagnóstico (confirmado por el código y tus logs)
### A. Foto de verificación: se está llamando sin fichajeId
En `src/components/fichero/FicheroFacialAuth.tsx`:
- Se llama `guardarFotoVerificacion({ empleadoId, fotoBase64, ... })`
- Pero **no se pasa `fichajeId`**, y el servicio lo exige -> por eso:
  - `fichajeId no proporcionado, omitiendo guardado`
  - `No se pudo guardar foto... fichajeId requerido`

La foto **tiene que subirse después** de `kiosk_insert_fichaje` (cuando ya existe el fichaje y tenemos el ID).

### B. Geolocalización “denied” es esperado (no error fatal)
- Si el usuario rechaza GPS, el navegador siempre devuelve `code: 1`.
- Hay que tratarlo como “sin GPS” y seguir.

### C. Config de alertas en /kiosco: se evalúa demasiado pronto
En `src/pages/KioscoCheckIn.tsx`:
- `const { config } = useFacialConfig()` (sin `loading`)
- Arranca con `lateArrivalAlertEnabled: false` por default
- Entonces a veces entra en el branch “config deshabilitada” antes de que llegue la config real desde DB.

---

## Cambios a implementar (3 fixes, sin vueltas)

### 1) Arreglar definitivamente el guardado de foto facial (con fichajeId)
**Archivos:**
- `src/components/fichero/FicheroFacialAuth.tsx`
- `src/pages/KioscoCheckIn.tsx`
- `src/pages/Fichero.tsx`
- `src/lib/verificacionFotosService.ts` (solo si hace falta mejorar mensajes/robustez, opcional)

**Acción: mover el upload de la foto al “post-fichaje”**
- En `FicheroFacialAuth.tsx`:
  - Eliminar el bloque que llama `guardarFotoVerificacion(...)`.
  - Capturar `fotoBase64` (ya lo haces con `capturarImagenCanvas(video)`).
  - Pasar `fotoBase64` al callback `onFichajeSuccess(...)` como argumento extra.

**Nuevo contrato de callback (simple):**
- `onFichajeSuccess(confianza, empleadoId?, empleadoData?, emocion?, fotoBase64?)`

**En `KioscoCheckIn.tsx` (kiosco):**
- Actualizar `procesarFichaje` para recibir `fotoBase64?: string`.
- Después del `supabase.rpc('kiosk_insert_fichaje', ...)` (cuando ya tenemos `fichajeId`):
  - Si `fotoBase64` existe => llamar `guardarFotoVerificacion({ fichajeId, empleadoId, fotoBase64, latitud/longitud, metodoFichaje:'facial', confianzaFacial: confianza, deviceToken })`.
  - `deviceToken`: pasar explícitamente `localStorage.getItem('kiosk_device_token')` (esto evita problemas si la validación de kiosco está activa).

**En `Fichero.tsx` (celular /fichero):**
- Extender `procesarFichaje(..., fotoBase64?)`.
- Después de `kiosk_insert_fichaje`:
  - Si `fotoBase64` existe => `guardarFotoVerificacion({ fichajeId, empleadoId, fotoBase64, latitud/longitud (si hay), metodoFichaje:'facial', confianzaFacial })`.
  - Si el Edge Function llegara a exigir `deviceToken` y en móvil no hay, lo manejamos como “foto pendiente” sin romper el fichaje (toast suave o solo log).

**Resultado esperado:**
- Se termina el warning de `fichajeId requerido`.
- Las fotos quedan asociadas a un fichaje real.
- El flujo no se bloquea si falla la foto: el fichaje igual queda.

---

### 2) Hacer que “User denied Geolocation” deje de ser un problema
**Archivos:**
- `src/pages/KioscoCheckIn.tsx`
- `src/pages/Fichero.tsx`
- (Opcional) crear helper en `src/lib/geo.ts` o similar para no duplicar lógica

**Acción: tratar “denied” como ‘Sin GPS’**
- En los lugares donde se pide GPS:
  - Si `error.code === 1` (permission denied):
    - No mostrar toast destructivo.
    - Log a nivel info y continuar con `lat/lng = null`.
- (Mejor aún) si `navigator.permissions` está disponible:
  - Si el estado es `denied`, ni llamar `getCurrentPosition` (evita ruido).

**Resultado esperado:**
- El fichaje funciona igual aunque rechace GPS.
- Menos ruido y menos “sensación de error”.

---

### 3) Evitar el “config deshabilitada” falso por race condition (loading) en /kiosco
**Archivo:**
- `src/pages/KioscoCheckIn.tsx`

**Acción: usar `loading` del hook igual que hicimos en móvil**
- Cambiar a:
  - `const { config, loading: facialConfigLoading } = useFacialConfig()`
  - `const alertasHabilitadas = facialConfigLoading ? true : config.lateArrivalAlertEnabled`
- Reemplazar los checks actuales:
  - donde dice `if (config.lateArrivalAlertEnabled) { ... } else { logCruzRoja.configDeshabilitada(...) }`
  - por `if (alertasHabilitadas) { ... } else { ... }`

**Resultado esperado:**
- No vuelve a aparecer “Verificación omitida - config deshabilitada” por timing.
- Las alertas empiezan a evaluarse siempre (por defecto) mientras carga la config.

---

## Pruebas de verificación (para que esto cierre hoy)
1) En **/kiosco**, con GPS rechazado:
   - Hacer fichaje de entrada.
   - Confirmar:
     - No hay toast destructivo por GPS.
     - Se registra fichaje.
     - Se intenta guardar foto con `fichajeId` (sin warning de “fichajeId requerido”).

2) Forzar un caso de “llegada tarde”:
   - Confirmar que ya no aparece “config deshabilitada” si la config real está en true (y mientras carga también).

3) Verificar storage + DB:
   - Bucket `fichajes-verificacion`: debe aparecer el archivo en el path `fichajeId/timestamp.jpg`.
   - Tabla/registro del RPC `kiosk_guardar_foto_verificacion`: debe quedar el vínculo fichaje-foto.

---

## Riesgos / consideraciones
- Si el Edge Function `kiosk-upload-verification-photo` requiere `deviceToken` porque hay kioscos activos, en móvil podría fallar la carga de foto. En ese caso:
  - el fichaje debe seguir igual,
  - y podemos definir una estrategia: “móvil sube sin deviceToken si viene autenticado” (eso sería un ajuste posterior del Edge Function con validación por sesión).
