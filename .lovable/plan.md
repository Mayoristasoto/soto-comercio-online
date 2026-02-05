
## Qué está pasando (sí se puede solucionar)

El error **no es “misterioso” ni de zona horaria ahora mismo**. En tu red se ve clarísimo:

- La llamada a `POST /rest/v1/rpc/kiosk_get_pausa_inicio` responde **HTTP 300**
- Con código **PGRST203**
- Mensaje: **“Could not choose the best candidate function…”**
- Te está diciendo que existen **2 funciones con el mismo nombre**:
  - `kiosk_get_pausa_inicio(uuid, text)`
  - `kiosk_get_pausa_inicio(uuid, timestamptz)`

PostgREST (la capa REST/RPC de Supabase) **no puede resolver sobrecarga de funciones** (dos firmas para el mismo nombre) y por eso el cliente termina mostrando algo como **“ObjectNo properties”**.

Además, la versión `(..., text)` actualmente tiene un bug adicional: usa `f.tipo_accion = 'pausa_inicio'`, pero en tu tabla `fichajes` el campo es **`tipo`** (esto lo confirma `src/integrations/supabase/types.ts`).

Conclusión: **sí se puede** y el arreglo es directo: dejar **una sola** función RPC y que consulte la columna correcta.

---

## Objetivo

1) El RPC `kiosk_get_pausa_inicio` debe ser **único** (sin sobrecarga).  
2) Debe filtrar por `f.tipo = 'pausa_inicio'` (no `tipo_accion`).  
3) Debe seguir funcionando en kiosco sin sesión (SECURITY DEFINER + grants).  
4) El front debe manejar respuestas “raras” con extracción segura para evitar que un formato inesperado rompa el flujo.

---

## Cambios a implementar

### A) Base de datos (migración Supabase)

Crear una nueva migración SQL que haga:

1. **Eliminar la función vieja** (la que recibe `timestamptz`) para evitar ambigüedad:
   - `DROP FUNCTION IF EXISTS public.kiosk_get_pausa_inicio(uuid, timestamptz);`

2. **Recrear/ajustar la función única** `public.kiosk_get_pausa_inicio(uuid, text)`:
   - Mantener `SECURITY DEFINER`
   - Mantener `SET search_path = public`
   - Corregir el filtro:
     - `AND f.tipo = 'pausa_inicio'`
   - Cast explícito:
     - `AND f.timestamp_real >= (p_desde::timestamptz)`

3. **Asegurar permisos**:
   - `GRANT EXECUTE ON FUNCTION public.kiosk_get_pausa_inicio(uuid, text) TO anon;`
   - `GRANT EXECUTE ... TO authenticated;`

Resultado esperado:
- La llamada RPC deja de devolver 300/PGRST203 y devuelve 200 con:
  - `[]` si no hay pausa_inicio hoy
  - `[ { id, timestamp_real } ]` si existe

---

### B) Frontend: robustecer parsing + logging (KioscoCheckIn.tsx)

En `calcularPausaExcedidaEnTiempoReal`:

1. Mantener el logging actual, pero cuando haya error, loguear explícitamente:
   - `pausaError.code`
   - `pausaError.message`
   - `pausaError.hint`
   Esto ayuda a identificar inmediatamente problemas de PostgREST vs SQL.

2. Implementar extracción segura del primer item:
   - Caso ideal: `Array.isArray(pausaData) && pausaData.length > 0`
   - Si no es array (por cualquier motivo), loguear estructura y retornar `null` sin romper el flujo.

Esto no reemplaza el fix de DB, pero evita que un “formato inesperado” deje la UX en un estado inconsistente.

---

## Verificación paso a paso (para que no quede duda)

1) Ir a `/test-kiosko-alertas`  
2) Seleccionar el empleado `96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4`  
3) Click en **“Preparar Escenario”** (esto debería crear `pausa_inicio`)  
4) Ir a `/kiosco`  
5) Hacer el flujo de “Terminar Pausa” (pausa_fin)

Validaciones en consola/red:
- Network: `rpc/kiosk_get_pausa_inicio` debe responder **200**
- En consola:
  - Debe aparecer `pausaData isArray: true`
  - `pausaData length: 1` (en el escenario preparado)
- Si excede: debería disparar alerta + RPC `kiosk_registrar_cruz_roja`

---

## Archivos/recursos involucrados

- DB:
  - Nueva migración en `supabase/migrations/...sql` para:
    - Dropear overload `(uuid, timestamptz)`
    - Corregir función `(uuid, text)` usando `f.tipo`
- App:
  - `src/pages/KioscoCheckIn.tsx` (parsing seguro + mejor logging)

---

## Riesgos y cómo los mitigamos

- Riesgo: al dropear la firma `(..., timestamptz)` algo la use.
  - Mitigación: en el front ya estás enviando `p_desde` como string ISO; el RPC que queda es el correcto.

- Riesgo: el kiosco realmente no tiene `pausa_inicio` guardada.
  - Mitigación: el test “Preparar Escenario” crea el caso. Si aun así devuelve `[]`, entonces ya no sería un problema de RPC sino de datos/flujo de fichajes (otro diagnóstico).

---

## Resultado esperado

- Se elimina el error **PGRST203 / ObjectNo properties**
- Vuelve a funcionar el cálculo en tiempo real de pausa excedida
- Se registran “cruces rojas” de pausa excedida cuando corresponde
