
# Plan: Login con Email + PIN como contrasena (primera vez)

## Que se quiere lograr

Cuando un empleado ingresa por primera vez en la pestana "Email", puede poner su email y su PIN (4 ultimos digitos del DNI) en el campo de contrasena. El sistema detecta que es un primer login, crea la sesion y fuerza el cambio de contrasena. A partir de ahi, el empleado usa su email y la nueva contrasena que eligio.

## Flujo propuesto

```text
Empleado ingresa email + PIN (4 digitos) en pestana Email
         |
         v
Intenta signInWithPassword (email + PIN)
         |
    ¿Funciono? ──SI──> Login normal (ya tiene contrasena configurada)
         |
        NO (Invalid login credentials)
         |
         v
Busca empleado por email en tabla 'empleados'
         |
    ¿Existe? ──NO──> Muestra error "Credenciales invalidas"
         |
        SI
         |
    ¿Es admin_rrhh? ──SI──> Muestra error "Credenciales invalidas"
         |
        NO
         |
         v
Llama a edge function 'pin-first-login' con (empleado_id, pin)
         |
    ¿PIN valido? ──NO──> Muestra error de PIN
         |
        SI
         |
         v
Verifica OTP para crear sesion
         |
         v
Sesion creada + debe_cambiar_password = true
         |
         v
Redirige a dashboard → Se muestra dialogo de cambio de contrasena obligatorio
```

## Cambios a realizar

### 1. Archivo: `src/pages/UnifiedAuth.tsx`

Modificar la funcion `handleSignIn` para que, cuando `signInWithPassword` falle con "Invalid login credentials" y la contrasena tenga 4 digitos (parece ser un PIN), intente el flujo de PIN como fallback:

- Despues del error de `signInWithPassword`, verificar si `password.length === 4` y es numerico
- Si es asi, buscar al empleado por email en la tabla `empleados`
- Si existe y no es admin, llamar a `pin-first-login` con el `empleado_id` y el PIN
- Si el PIN es valido, verificar el OTP para crear la sesion
- Si falla todo, mostrar el error original de credenciales invalidas

### 2. Subtexto informativo (opcional)

Agregar un texto pequeno debajo del campo de contrasena que diga: "Primera vez? Usa los 4 ultimos digitos de tu DNI como contrasena" para guiar al empleado.

## Detalles tecnicos

El cambio es exclusivamente en `src/pages/UnifiedAuth.tsx`, en la funcion `handleSignIn` (lineas 60-146). No se necesitan cambios en el edge function ni en otros componentes, ya que `pin-first-login` ya maneja la creacion del usuario auth, la vinculacion y el flag `debe_cambiar_password`.

La logica agregada seria aproximadamente:

```typescript
// Dentro del catch de signInWithPassword, si el error es "Invalid login credentials"
// y el password parece un PIN (4 digitos numericos):
if (error.message === 'Invalid login credentials' && /^\d{4}$/.test(password)) {
  // Buscar empleado por email
  const { data: emp } = await supabase
    .from('empleados')
    .select('id, rol')
    .eq('email', email.toLowerCase().trim())
    .eq('activo', true)
    .single()

  if (emp && emp.rol !== 'admin_rrhh') {
    // Intentar login con PIN
    const { data: pinData } = await supabase.functions.invoke('pin-first-login', {
      body: { empleado_id: emp.id, pin: password }
    })

    if (pinData?.success) {
      // Verificar OTP para crear sesion
      await supabase.auth.verifyOtp({
        email: pinData.email,
        token: pinData.email_otp,
        type: 'email'
      })
      // Redirige automaticamente via onAuthStateChange
      return
    }
  }
}
```

No se requieren migraciones de base de datos ni cambios en edge functions.
