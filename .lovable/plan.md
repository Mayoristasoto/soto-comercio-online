

## Diagnóstico: foto faltante en check-in PIN de Agustina (08:32)

### Lo que encontré
Revisé los fichajes de Agustina del 20/04/2026:

| Hora | Tipo | Foto guardada |
|------|------|---------------|
| **08:32 Entrada** | PIN | ❌ **NO** |
| 12:22 Pausa inicio | PIN | ✅ Sí |
| 12:53 Pausa fin | PIN | ✅ Sí |
| 14:25 Salida | PIN | ✅ Sí |

Solo el **primer fichaje del día** (la entrada) no tiene foto registrada en `fichajes_fotos_verificacion`. Los otros 3 fichajes del mismo día con el mismo método (PIN) sí guardaron foto correctamente.

### Por qué pasó
Mirando `FicheroPinAuth.tsx`, el flujo actual es:
1. Empleado captura foto → se guarda en `fotoCapturada` (estado en memoria)
2. Click en "Confirmar" → se llama `kiosk_fichaje_pin` (crea el registro en `fichajes`)
3. Después se llama `guardarFotoVerificacion` (sube foto a Storage vía Edge Function)

El problema: **el paso 2 (crear fichaje) y el paso 3 (subir foto) son independientes**. Si el paso 3 falla (red, timeout, error de Edge Function), el fichaje queda registrado **pero sin foto**, y solo se muestra un toast "Foto pendiente" que el operador puede no ver o ignorar.

Causas más probables del fallo en ese fichaje específico:
- **Red intermitente** en el momento exacto del primer fichaje del día (el kiosco recién encendido suele tener latencia más alta).
- **Edge Function `kiosk-upload-verification-photo`** falló o tuvo timeout. Los logs de esa edge function aparecen vacíos lo cual sugiere que ni siquiera llegó la invocación, o el error fue del lado del cliente antes de la llamada.
- **El operador cerró/refrescó la pantalla** después del fichaje pero antes de que la subida terminara.

Además noté que **el fichaje no tiene GPS** (`latitud: null, longitud: null`) — coincide con la columna "Sin GPS" de tu screenshot. Esto sugiere que el dispositivo tuvo problemas de permisos/red en ese momento (aunque GPS no es obligatorio aún si no activaste el toggle).

### Plan de mejora — Hacer la foto obligatoria y auditable

Para evitar que vuelva a pasar:

#### 1. Reintento automático de subida de foto
En `verificacionFotosService.ts` agregar reintentos (3 intentos con backoff exponencial: 1s, 3s, 9s) antes de declarar fallo.

#### 2. Marcar fichaje como "foto pendiente" en BD
Si después de los reintentos la subida sigue fallando, guardar la foto en `localStorage` con la clave `pending_photos` y mostrar un banner persistente en el kiosco: **"⚠️ Hay N fotos pendientes de subir"**. Un proceso en background reintenta cada 30s mientras haya conexión.

#### 3. Indicador visual claro al operador
Cambiar el toast actual ("Foto pendiente") por un **diálogo modal bloqueante** que obligue al operador a confirmar que vio el error antes de continuar con el siguiente fichaje. Así no pasa desapercibido.

#### 4. Reporte de fichajes sin foto
Agregar una vista en el panel admin (`FotosVerificacionViewer`) con filtro **"Solo fichajes sin foto"** para que RRHH pueda detectar estos casos y pedir verificación adicional al empleado.

#### 5. (Opcional) Marca en columna "Sin GPS / Sin Foto" del listado
En la tabla de fichajes que ves en el screenshot, agregar un badge rojo **"Sin Foto"** junto al ícono de cámara cuando no hay foto, para hacerlo evidente visualmente.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/verificacionFotosService.ts` | Agregar lógica de reintentos + cola en localStorage |
| `src/components/kiosko/FicheroPinAuth.tsx` | Mostrar modal bloqueante si la foto no se sube tras reintentos |
| `src/components/kiosko/PendingPhotosBanner.tsx` | **NUEVO** — Banner que muestra fotos pendientes y reintenta en background |
| `src/pages/KioscoCheckIn.tsx` | Renderizar el banner de fotos pendientes |
| `src/components/admin/FotosVerificacionViewer.tsx` | Filtro "Sin foto" + badge rojo |

### Acción inmediata para el fichaje actual
Como el fichaje ya está registrado sin foto, las opciones son:
- **A)** Pedirle a Agustina que pase nuevamente por el kiosco a tomarse una foto de verificación (manual, sin generar nuevo fichaje).
- **B)** Eliminar ese fichaje y pedirle que lo registre nuevamente (más estricto pero asegura el audit trail).
- **C)** Dejarlo como está y marcar el caso como justificado (si confiás que efectivamente fichó).

