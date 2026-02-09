

## Corregir error: "column reference empleado_id is ambiguous"

### Problema
La funcion `blanquear_pins_con_dni` define `empleado_id` como columna de retorno (`RETURNS TABLE(empleado_id uuid, ...)`), lo que crea una variable PL/pgSQL con ese nombre. Cuando se ejecuta el `INSERT INTO empleados_pin (empleado_id, ...)`, PostgreSQL no sabe si `empleado_id` se refiere a la columna de la tabla o a la variable de retorno.

### Solucion
Renombrar las columnas del `RETURNS TABLE` para que no colisionen con las columnas de las tablas. Por ejemplo, usar prefijos como `out_empleado_id`, `out_nombre`, etc.

### Detalle tecnico

**Migracion SQL:**
- Recrear la funcion con `RETURNS TABLE(out_empleado_id uuid, out_nombre text, out_apellido text, out_legajo text, out_dni text, out_pin_asignado text, out_email text)`
- Actualizar el `RETURN QUERY SELECT` para que use los alias correctos
- Mantener `SET search_path = public, extensions`

**Codigo frontend (`PinManagement.tsx`):**
- Revisar si el componente accede a los nombres de columna del resultado (ej: `resultado.empleado_id`) y actualizar a los nuevos nombres (`resultado.out_empleado_id`), o bien agregar aliases en el RETURN QUERY para mantener compatibilidad.

Opcion mas limpia: renombrar solo en la definicion de la funcion y usar aliases en el SELECT final para que el resultado devuelva los mismos nombres que el frontend espera.

