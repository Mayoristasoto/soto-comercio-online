## Cargar 57 días de ausencia mensualizados en el informe ejecutivo

### Categorías nuevas a crear

En `categorias_justificacion_asistencia`:

| Nombre | Justifica | Color |
|---|---|---|
| Enfermedad | ✅ | #0ea5e9 |
| Enfermedad familiar | ✅ | #14b8a6 |
| Ausente | ❌ | #f97316 |

### 15 filas a procesar (mes de 2026)

| Mes | Empleado | Categoría | Días |
|---|---|---|---|
| Enero | Merino | Enfermedad | 5 |
| Enero | Lan | Enfermedad | 1 |
| Enero | Lan | Enfermedad familiar | 1 |
| Enero | Bartolo Loyola | Enfermedad | 3 |
| Enero | Chumpitaz | Enfermedad | 5 |
| Febrero | Conforti | Enfermedad | 3 |
| Marzo | Conforti | Enfermedad | 18 |
| Marzo | Carrion | Enfermedad | 3 |
| Marzo | Romero | Enfermedad | 2 |
| Marzo | Bartolo Loyola | Ausente | 1 |
| Marzo | Lan | Ausente | 1 |
| Marzo | Merino | Ausente | 1 |
| Abril | Chumpitaz | Enfermedad familiar | 1 |
| Mayo | Chumpitaz | Enfermedad | 11 |
| Mayo | Carrion | Enfermedad | 1 |

### Asignación automática de fechas

Para cada fila, dentro del **mes indicado de 2026**:

1. Construyo los **días laborables** del empleado expandiendo sus `empleado_turnos` activos contra `fichado_turnos.dias_semana`.
2. Resto los días con **fichaje de entrada** registrado.
3. Resto los días que **ya tengan una justificación** (cualquier categoría).
4. Ordeno los días candidatos cronológicamente.
5. Tomo los **N días** que pide la fila y los inserto en `justificaciones_asistencia` con la nueva categoría y `observacion='<Categoría> 2026 - carga manual'`.
6. Si dos filas comparten empleado+mes (ej. Lan en enero: Enfermedad 1 + Enfermedad familiar 1), se procesan en orden, sin pisarse.

### Validación previa

Antes de insertar te muestro por consola, fila por fila, las fechas elegidas y aviso si algún empleado tiene menos días candidatos que los requeridos en ese mes (en ese caso no inserto esa fila y te lo reporto).

### Lo que NO se toca
- No se modifican fichajes ni turnos.
- No se reemplaza ninguna justificación existente (`ON CONFLICT DO NOTHING`).
- Sin cambios de código, sólo datos + catálogo.
