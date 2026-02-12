

# Fix: Error al anular cruces rojas (foreign key constraint)

## Problema

El campo `anulada_por` en la tabla `empleado_cruces_rojas` tiene una foreign key hacia la tabla `empleados`. El codigo actual guarda `auth.uid()` (el ID de autenticacion), pero ese ID no existe en `empleados` -- ahi se usa un campo `id` propio del empleado, no el `user_id`.

## Solucion

En ambos archivos, antes de hacer el UPDATE, buscar el `id` del empleado correspondiente al usuario autenticado:

```sql
SELECT id FROM empleados WHERE user_id = auth.uid()
```

Y usar ese `empleado.id` como valor de `anulada_por`.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/admin/FichajeMetricasDashboard.tsx` | En `anularCruzRojaDeRegistro`, buscar el empleado_id del usuario actual antes del update |
| `src/pages/ListadoIncidencias.tsx` | En `handleAnular`, aplicar el mismo fix |

## Detalle tecnico

En ambas funciones, reemplazar:

```typescript
const { data: { user } } = await supabase.auth.getUser()
// ...
anulada_por: user?.id || null,
```

Por:

```typescript
const { data: { user } } = await supabase.auth.getUser()
let empleadoId = null
if (user) {
  const { data: emp } = await supabase
    .from('empleados')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  empleadoId = emp?.id || null
}
// ...
anulada_por: empleadoId,
```

No se requieren migraciones de base de datos.

