
# Plan: Flujo de primer login de empleado con PIN

## Resumen del flujo

El flujo que describis ya esta implementado en el sistema. Asi funciona paso a paso:

1. **Empleado va a `/auth`** (la pagina de login unificada)
2. **Selecciona la pestana "PIN"**
3. **Busca su nombre** y selecciona su perfil
4. **Ingresa su PIN** (los ultimos 4 digitos de su DNI, ya que se blanquearon recientemente)
5. **El sistema crea la sesion** automaticamente via OTP
6. **Se redirige a `/mi-dashboard`** (por ser rol empleado)
7. **Se muestra el dialogo obligatorio de cambio de contrasena** (porque `debe_cambiar_password = true`)
8. **El empleado establece su nueva contrasena** y recien ahi puede usar el sistema
9. **A partir de ese momento**, puede acceder a vacaciones, solicitudes, adelantos, etc.

## Para probar ahora mismo

Podes probar con cualquiera de estos empleados (todos tienen PIN activo):

| Empleado | Email | DNI | PIN (ultimos 4) |
|----------|-------|-----|------------------|
| Laura Lan | lauralan@mayoristasoto.com | 22916230 | 6230 |
| Jesica Romero | jesicaromero@mayoristasoto.com | 31821231 | 1231 |
| Jonathan Vera | jonathanvera@mayoristasoto.com | 41128097 | 8097 |

### Pasos para probar:

1. Ir a `/auth`
2. Click en la pestana **"PIN"**
3. Buscar "Laura" (o el nombre que elijas)
4. Seleccionar el empleado
5. Ingresar el PIN de 4 digitos (ej: `6230`)
6. El sistema deberia pedir cambio de contrasena obligatorio
7. Establecer una nueva contrasena (minimo 8 caracteres, 1 mayuscula, 1 minuscula, 1 numero)
8. Una vez cambiada, podes navegar a `/rrhh/vacaciones` y `/rrhh/solicitudes`

## Ajustes necesarios

Hay un detalle que podria mejorar: actualmente el empleado con rol `empleado` **no tiene acceso a `/rrhh/solicitudes`** en la lista de rutas permitidas del `UnifiedLayout`. Solo tiene acceso a:
- `/mi-dashboard`
- `/reconoce/premios`
- `/rrhh/vacaciones`
- `/operaciones/tareas`
- `/operaciones/fichero`
- `/reconoce`, `/ranking`, `/desafios`, `/insignias`, `/premios`

La ruta `/rrhh/solicitudes` solo esta permitida para **gerentes**, no para empleados comunes. Habria que agregarla.

### Cambio a realizar

**Archivo:** `src/components/UnifiedLayout.tsx`

Agregar `/rrhh/solicitudes` y `/solicitudes` a las rutas permitidas para empleados (linea ~142):

```text
Antes:
const empleadoRoutes = [
  '/mi-dashboard', 
  '/reconoce/premios',
  '/rrhh/vacaciones',
  '/vacaciones',
  '/operaciones/tareas',
  ...
]

Despues:
const empleadoRoutes = [
  '/mi-dashboard', 
  '/reconoce/premios',
  '/rrhh/vacaciones',
  '/vacaciones',
  '/rrhh/solicitudes',
  '/solicitudes',
  '/operaciones/tareas',
  ...
]
```

Este es el unico cambio de codigo necesario. El resto del flujo (PIN login, creacion de usuario auth, cambio de contrasena forzado) ya esta implementado y funcional.
