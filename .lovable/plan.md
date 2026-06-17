## Objetivo
Crear dos sucursales lógicas (no físicas) **Administración** y **Ventas**, y reasignar a los empleados marcados en verde del Excel a esas nuevas sucursales.

## Pasos

### 1. Crear las dos nuevas sucursales
Insertar en la tabla `sucursales`:
- **Administración** — sin dirección/ciudad/provincia (es lógica), `activa = true`
- **Ventas** — sin dirección/ciudad/provincia (es lógica), `activa = true`

> Nota: la tabla `sucursales` no tiene un campo `tipo` para distinguir físicas vs lógicas. Quedarán simplemente sin dirección. Si querés, en un paso futuro puedo agregar una columna `tipo` ('fisica' / 'logica') — avisame.

### 2. Reasignar empleados a **Administración**
Actualizar `empleados.sucursal_id` para:
| Apellido | Nombre | DNI |
|---|---|---|
| Galeote | Mariano Matías | 38256298 |
| Justiniano | Gonzalo | 34058381 |
| Soto | Hugo Carlos | 8386725 |
| Soto | Juan Cruz | — |
| Soto | María Carolina | 25898323 |
| Diaz | Tomás Javier | 42282570 |
| Soto | Juan Ignacio | 27019436 |

### 3. Reasignar empleados a **Ventas**
| Apellido | Nombre | DNI |
|---|---|---|
| Galaz | Agustina Lucía | 42044300 |
| Voikli | Andrés Nicolás | 23133013 |

### 4. Olazar 26
Bartolo Loyo (Washintong Celindo, DNI 94099511) queda en **Olazar 26** (sucursal física existente, sin cambios).

### 5. Regenerar el Excel actualizado
Volver a generar `empleados_activos_por_sucursal.xlsx` reflejando la nueva agrupación (Administración, Ventas, José Martí, Juan B. Justo, Olazar 26) y la hoja "Resumen" con los nuevos totales.

## Notas técnicas
- Se hace por `INSERT` (nuevas sucursales) + `UPDATE` (reasignación), sin migración de esquema.
- Identificación de empleados por DNI (más confiable que nombre). Para "Juan Cruz Soto" sin DNI en la planilla, lo identifico por nombre+apellido exacto.
- No se toca `asignacion_empleado_sucursal` (asignaciones operativas) salvo que lo pidas explícitamente.
