

## Plan: Toggle GPS obligatorio para check-in con PIN

### Qué se hace
Agregar un switch en la sección "Configuración del Kiosco" del panel de reconocimiento facial que permita activar/desactivar GPS obligatorio cuando el empleado ficha con PIN.

### Cambios

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useFacialConfig.ts` | Agregar `pinGpsRequired: boolean` al interface y default `false` |
| `src/components/admin/FacialRecognitionConfig.tsx` | Agregar Switch en sección Kiosco + incluir en `handleSave` |
| `src/components/kiosko/FicheroPinAuth.tsx` | Leer config y bloquear check-in si GPS obligatorio y no disponible |

### Detalle del switch
Se ubica en la sección "Configuración del Kiosco" debajo de "Alerta de Llegada Tarde":
- Label: **GPS Obligatorio para PIN**
- Descripción: "Requiere que el GPS esté activado para permitir el check-in con PIN"
- Se guarda en `configuracion_facial` con clave `pinGpsRequired`

### Lógica en kiosco PIN
Cuando `pinGpsRequired = true`:
1. Antes de procesar el check-in, solicitar geolocalización
2. Si el usuario deniega o falla GPS, mostrar error y no permitir fichar
3. Si GPS OK, continuar normalmente (ya se guarda lat/lng en fichaje)

No requiere migración de base de datos (usa la tabla `configuracion_facial` existente de key-value).

