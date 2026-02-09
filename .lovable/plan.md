

## Corregir error: "function gen_salt(unknown, integer) does not exist"

### Problema
La funcion `blanquear_pins_con_dni` falla porque usa `gen_salt()` y `crypt()` de la extension `pgcrypto`, pero esa extension esta instalada en el schema `extensions`. La funcion tiene `SET search_path = public`, lo que impide encontrar las funciones de pgcrypto.

### Solucion
Recrear la funcion `blanquear_pins_con_dni` cambiando el `search_path` para incluir el schema `extensions`:

```text
SET search_path = public, extensions
```

Esto permite que la funcion encuentre `gen_salt()` y `crypt()` sin necesidad de calificarlas con el schema.

### Detalle tecnico

**Migracion SQL:**
- `CREATE OR REPLACE FUNCTION public.blanquear_pins_con_dni()` con `SET search_path = public, extensions`
- El resto de la funcion permanece identico
- Se mantiene el `GRANT EXECUTE` para `authenticated`

### Sobre los otros errores en consola
- **GeolocationPositionError**: El navegador denego permisos de ubicacion. No bloquea el blanqueo de PINs, es un chequeo de seguridad separado. Se puede ignorar si no se requiere validacion por ubicacion.
- **Error 406 en ips_permitidas**: Consulta de IPs permitidas que no encuentra registros. Tampoco bloquea la funcionalidad de PINs.

