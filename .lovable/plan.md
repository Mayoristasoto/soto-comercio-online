

# Asignar PIN 9968 a dwadad dwaddw

## Empleado encontrado
- **Nombre**: dwadad dwaddw
- **ID**: `1c47d588-4da1-4ac9-b6a1-2e553c596251`
- **Email**: dwada@dwdwoa.com
- Ya tiene un registro en `empleados_pin` (sera actualizado)

## Accion
Actualizar el PIN del empleado usando la edge function `crear-tareas-batch` con accion update sobre la tabla `empleados_pin`, aplicando el hash bcrypt del PIN 9968.

Sin embargo, el hash debe generarse con la funcion `hash_pin` de la base de datos para mantener consistencia con el sistema de verificacion existente.

## Implementacion

### Paso 1 - Agregar soporte de PIN en la edge function
Modificar `crear-tareas-batch` (o crear una nueva funcion) para aceptar una accion `set_pin` que:
1. Reciba `empleado_id` y `pin` en texto plano
2. Use la funcion SQL `hash_pin()` via RPC para generar el hash
3. Actualice la tabla `empleados_pin` con el hash resultante

### Paso 2 - Ejecutar la asignacion
Invocar la funcion con:
```text
POST /crear-tareas-batch
{
  "action": "set_pin",
  "empleado_id": "1c47d588-4da1-4ac9-b6a1-2e553c596251",
  "pin": "9968"
}
```

### Paso 3 - Verificar
Confirmar que el PIN fue actualizado correctamente en `empleados_pin`.

## Detalle tecnico
La funcion `hash_pin` en la base de datos usa bcrypt (`crypt` con `gen_salt('bf')`) para hashear el PIN. La edge function ejecutara `SELECT hash_pin('9968')` via el cliente Supabase con service role key, y luego actualizara el registro en `empleados_pin` con el hash resultante, reseteando intentos fallidos y desbloqueo.

