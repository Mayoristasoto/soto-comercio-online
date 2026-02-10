

# Desactivar pestaña "Estado Ánimo" para empleados

## Cambio

En `src/pages/Fichero.tsx`, la pestaña "Estado Ánimo" (línea 794) se muestra a todos los roles sin restricción. Se modificará para que solo sea visible para `admin_rrhh` y `gerente_sucursal`, ocultándola del panel del empleado.

## Detalle técnico

**Archivo:** `src/pages/Fichero.tsx`

Línea 794 - Cambiar:
```ts
{ key: 'estado-animo', label: 'Estado Ánimo', icon: User },
```
Por:
```ts
...(['gerente_sucursal', 'admin_rrhh'].includes(empleado.rol) ? [{ key: 'estado-animo', label: 'Estado Ánimo', icon: User }] : []),
```

Esto usa el mismo patrón que ya se aplica a otras pestañas restringidas (como "Cambios Horario" en línea 801).

No se requieren cambios en la base de datos ni en otros archivos.
