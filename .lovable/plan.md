# Corrección RPC `get_novedades_liquidacion`

## Problema
La función falla con `42702: column reference "empleado_id" is ambiguous`. Postgres no distingue entre la variable PL/pgSQL del loop y la columna `empleado_id` de alguna tabla en los `WHERE` internos (típicamente en `fichajes`, `solicitudes_vacaciones`, `ausencias_medicas`, `solicitudes_generales` o `feriado_empleados_asignados`).

## Solución
Crear una nueva migración que reemplace (`CREATE OR REPLACE FUNCTION`) la RPC con dos cambios mínimos:

1. **Renombrar las variables PL/pgSQL** del loop para que no choquen con nombres de columnas:
   - `empleado_id` → `v_emp_id`
   - `fecha`/`v_d` → `v_fecha` (si aplica)
   - Cualquier otra variable que colisione (`sucursal_id`, `turno_id`, etc.) → prefijo `v_`.

2. **Calificar todas las referencias** dentro de subqueries usando el alias de la tabla (ej. `f.empleado_id = v_emp_id`, `sv.empleado_id = v_emp_id`, `am.empleado_id = v_emp_id`, `sg.empleado_id = v_emp_id`).

3. Mantener intacta la firma de retorno (mismas columnas y tipos) para no romper el frontend ni `types.ts`.

No se tocan tablas, políticas RLS, ni código del frontend. Sólo se redefine la función.

## Verificación
- Recargar `/rrhh/novedades-liquidacion` y confirmar que el listado carga sin el error 400.
- Probar con filtro de sucursal y rango de fechas del mes actual.
