## Objetivo

Agregar configuración por empleado para:
1. **GPS obligatorio** (aplica a fichaje PIN y facial)
2. **Prueba de vida obligatoria al fichar con PIN** (parpadeo/movimiento, no solo foto)
3. **Retención de 10 fotos + 10 ubicaciones recientes** específicamente para Agustina Galaz

---

## 1. Base de datos

**Migración** que agrega 2 columnas a `empleados`:

- `gps_obligatorio` BOOLEAN DEFAULT false — fuerza GPS activo en cualquier fichaje (PIN o facial)
- `liveness_obligatorio` BOOLEAN DEFAULT false — fuerza prueba de vida en fichaje con PIN

**Tabla nueva `empleados_ubicaciones_recientes`** (para Agustina y futuros casos similares):
- `empleado_id`, `lat`, `lng`, `accuracy`, `metodo` ('pin'|'facial'), `fichaje_id`, `created_at`
- RLS: admins leen, edge functions/RPC escriben
- GRANTs estándar

**Trigger / función `mantener_ultimas_n_ubicaciones`** que purga al insertar, dejando solo las últimas N (10 por defecto). Se ejecuta solo si el empleado tiene flag `retener_ubicaciones_recientes` activo (nuevo bool en `empleados`, inicializado true para Agustina).

**Trigger en `fichajes_fotos_verificacion`** equivalente: cuando un empleado tiene `retener_fotos_recientes = true`, al insertar nueva foto se purgan las anteriores dejando solo 10 (eliminando archivo en storage vía función).

Inicialización para Agustina (`56cf495f-41ca-4615-8a57-05d62c429c9c`):
```sql
UPDATE empleados SET 
  retener_ubicaciones_recientes = true,
  retener_fotos_recientes = true
WHERE id = '56cf495f-41ca-4615-8a57-05d62c429c9c';
```

---

## 2. Frontend — Configuración por empleado

En `src/components/admin/EmployeeProfile.tsx` (o pestaña Seguridad/Fichaje del perfil), agregar 2 switches:
- "GPS obligatorio en fichaje"
- "Prueba de vida obligatoria al fichar con PIN"

Persisten en `empleados.gps_obligatorio` y `empleados.liveness_obligatorio`.

---

## 3. Frontend — Flujo PIN (`src/components/kiosko/FicheroPinAuth.tsx`)

Después de seleccionar empleado, leer flags del empleado (`gps_obligatorio`, `liveness_obligatorio`).

**GPS obligatorio:**
- Si flag activo y `getCurrentPosition` falla → bloquear fichaje (mensaje claro). Hoy ya existe lógica con `pinGpsRequired` global; se extiende para usar `OR (empleado.gps_obligatorio)`.

**Prueba de vida (parpadeo) en PIN:**
- Si `liveness_obligatorio = true`, antes de la captura, ejecutar detección de parpadeo usando `face-api.js` (ya cargado en kiosco facial).
- Reusar el detector existente: cargar modelos `tinyFaceDetector` + `faceLandmark68Net`, calcular EAR (eye aspect ratio) sobre frames durante ~5s, exigir al menos 1 parpadeo (EAR < 0.22 → > 0.28).
- Si no se detecta parpadeo en X segundos → mostrar mensaje "Parpadee al menos una vez" y reintentar; cancelar fichaje si se aborta.
- Capturar la foto durante o inmediatamente después del parpadeo confirmado.

Crear utilitario nuevo `src/lib/livenessDetection.ts` con función `detectarParpadeo(videoEl, opts): Promise<{ok: boolean, foto?: string}>`.

---

## 4. Frontend — Flujo Facial (`src/pages/KioscoCheckIn.tsx`)

Tras reconocer al empleado, antes de confirmar el fichaje:
- Si `empleado.gps_obligatorio = true` y no hay coords válidas → bloquear con mensaje claro y pedir habilitar GPS.

(El flujo facial ya hace liveness de algún tipo; no se modifica esa parte.)

---

## 5. Persistencia adicional para empleados con retención

Tras un fichaje exitoso, además del INSERT actual en `fichajes_fotos_verificacion`:
- Si `empleado.retener_ubicaciones_recientes = true`, INSERT en `empleados_ubicaciones_recientes` con lat/lng/accuracy.
- Los triggers se encargan de purgar a 10 entradas máx.

El insert de la ubicación se hace dentro del RPC `kiosk_fichaje_pin` y del flujo facial (RPC server-side) para no depender del cliente.

---

## 6. Visualización (admin)

Nueva sección en `EmployeeProfile.tsx` "Auditoría reciente" (visible solo si el empleado tiene los flags de retención):
- Galería de últimas 10 fotos (signed URLs desde storage)
- Mapa simple o lista con últimas 10 ubicaciones (lat/lng + fecha + método)

---

## Detalles técnicos

**Archivos a crear:**
- `src/lib/livenessDetection.ts` — utilidad de detección de parpadeo
- `src/components/admin/EmployeeAuditoriaReciente.tsx` — galería de fotos + lista ubicaciones

**Archivos a modificar:**
- `src/components/kiosko/FicheroPinAuth.tsx` — leer flags por empleado, integrar liveness, validar GPS
- `src/pages/KioscoCheckIn.tsx` — validar GPS por empleado en flujo facial
- `src/components/admin/EmployeeProfile.tsx` — switches de GPS/liveness + sección auditoría

**Migración:**
- ALTER `empleados` + 4 columnas (`gps_obligatorio`, `liveness_obligatorio`, `retener_fotos_recientes`, `retener_ubicaciones_recientes`)
- CREATE `empleados_ubicaciones_recientes` con GRANTs + RLS + triggers de purga
- Trigger `purgar_fotos_verificacion_recientes` sobre `fichajes_fotos_verificacion`
- UPDATE para Agustina activando ambos retener_* y `liveness_obligatorio` + `gps_obligatorio`

**RPC `kiosk_fichaje_pin`:** ampliar para insertar en `empleados_ubicaciones_recientes` cuando corresponda (usa SECURITY DEFINER, ya bypassa RLS).

---

## Validación

1. Activar `gps_obligatorio` en un empleado de prueba → simular GPS bloqueado → fichaje rechazado tanto en PIN como facial.
2. Activar `liveness_obligatorio` → entrar al flujo PIN → no permitir capturar foto sin parpadeo detectado.
3. Hacer 12 fichajes consecutivos para Agustina → verificar que solo quedan las últimas 10 fotos en `fichajes_fotos_verificacion` (filtrado por empleado_id) y 10 ubicaciones en `empleados_ubicaciones_recientes`.
4. Confirmar que para empleados sin flag, el comportamiento actual no cambia.