## Objetivo
Desactivar `gps_obligatorio` para todos los empleados, manteniéndolo activo únicamente para **Galaz Agustina**.

## Cambios

1. **Update masivo en `empleados`**: poner `gps_obligatorio = false` en todos los registros.
2. **Excepción**: poner `gps_obligatorio = true` solo en el empleado cuyo nombre/apellido coincide con "Galaz Agustina".

## SQL a ejecutar
```sql
UPDATE public.empleados SET gps_obligatorio = false;
UPDATE public.empleados SET gps_obligatorio = true
WHERE unaccent(lower(nombre)) LIKE '%agustina%'
  AND unaccent(lower(apellido)) LIKE '%galaz%';
```

Antes de aplicar verifico que exista exactamente una empleada Galaz Agustina para no activarlo por error en otra persona. Si hay homónimos, te pregunto cuál es la correcta antes de ejecutar.

## Notas
- No toco el flag global `pinGpsRequired` (config de kiosco), solo el override por empleado.
- No hay cambios de código, es solo data.
