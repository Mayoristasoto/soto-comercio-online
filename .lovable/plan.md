

# Fix: Login con PIN falla por restriccion RLS

## Problema

Cuando el empleado intenta loguearse con email + PIN, el fallback falla porque:

1. `signInWithPassword` falla (correcto, es primer login)
2. Se intenta buscar al empleado en la tabla `empleados` con `supabase.from('empleados').select(...).eq('email', ...).single()`
3. Como el usuario **no esta autenticado**, las politicas RLS bloquean la lectura
4. La query devuelve **406 (Not Acceptable)**
5. El fallback no encuentra al empleado y muestra "Invalid login credentials"

## Solucion

En vez de buscar al empleado en el cliente (sin autenticacion), enviar el **email** directamente al edge function `pin-first-login`, que ya usa el service role key y puede consultar la tabla sin restricciones RLS.

## Cambios

### 1. Archivo: `src/pages/UnifiedAuth.tsx` (funcion handleSignIn)

Modificar el bloque de fallback PIN para que en vez de buscar al empleado por email en el cliente, envie el email al edge function:

```typescript
// ANTES (falla por RLS):
const { data: emp } = await supabase
  .from('empleados')
  .select('id, rol')
  .eq('email', email.toLowerCase().trim())
  .eq('activo', true)
  .single();

if (emp && emp.rol !== 'admin_rrhh') {
  const { data: pinData } = await supabase.functions.invoke('pin-first-login', {
    body: { empleado_id: emp.id, pin: password }
  });
  ...
}

// DESPUES (enviar email al edge function):
const { data: pinData, error: pinError } = await supabase.functions.invoke('pin-first-login', {
  body: { email: email.toLowerCase().trim(), pin: password }
});

if (!pinError && pinData?.success && pinData?.email_otp) {
  // verificar OTP...
}
```

### 2. Archivo: `supabase/functions/pin-first-login/index.ts`

Modificar el edge function para aceptar `email` como alternativa a `empleado_id`:

- Si recibe `email` (y no `empleado_id`), buscar al empleado por email en la tabla `empleados` usando el admin client
- Si recibe `empleado_id`, mantener el comportamiento actual
- Validar que el empleado exista, este activo, y no sea admin_rrhh
- El resto del flujo (verificacion de PIN, creacion de usuario, OTP) permanece igual

Cambio en las primeras lineas del handler:

```typescript
const { empleado_id, email, pin } = await req.json()

if (!pin || (!empleado_id && !email)) {
  return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), { status: 400 })
}

let targetEmpleadoId = empleado_id

// Si se recibe email en vez de empleado_id, buscar al empleado
if (!targetEmpleadoId && email) {
  const { data: emp, error: empErr } = await supabaseAdmin
    .from('empleados')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('activo', true)
    .single()

  if (empErr || !emp) {
    return new Response(JSON.stringify({ error: 'Empleado no encontrado' }), { status: 404 })
  }
  targetEmpleadoId = emp.id
}

// Usar targetEmpleadoId en lugar de empleado_id en el resto del codigo
```

Esto elimina la necesidad de consultar `empleados` desde el cliente sin autenticacion.

