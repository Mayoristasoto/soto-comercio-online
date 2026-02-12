

# Configuracion de Jornada Flexible Semanal

## Problema actual

Hoy el sistema solo permite configurar `horas_jornada_estandar` por empleado como un valor diario (ej: 8 horas/dia). No hay forma de definir un objetivo semanal (ej: 36 horas en 6 dias) ni configurar la duracion de pausa individual por empleado independiente del turno.

## Solucion propuesta

Agregar dos nuevos campos a la tabla `empleados` y actualizar la logica de calculo del balance para soportar jornadas flexibles semanales.

### Cambios en base de datos

Agregar 3 columnas a la tabla `empleados`:

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `tipo_jornada` | text | `'diaria'` | Valores: `diaria` o `semanal` |
| `horas_semanales_objetivo` | numeric | `null` | Total de horas semanales objetivo (ej: 36) |
| `dias_laborales_semana` | integer | `6` | Cantidad de dias laborales en la semana |

No se agrega campo de pausa individual porque ya existe `duracion_pausa_minutos` en `fichado_turnos`, y el turno de tipo `flexible` ya lo soporta. Para este empleado se crea un turno flexible con pausa de 30 minutos.

### Configuracion del empleado especifico

Con los nuevos campos, se configura asi:

- `tipo_jornada`: `'semanal'`
- `horas_semanales_objetivo`: `36`
- `dias_laborales_semana`: `6`
- Se le asigna un turno de tipo `flexible` con `duracion_pausa_minutos: 30`

### Cambios en la interfaz

#### 1. Reporte de Horas Trabajadas (`ReporteHorasTrabajadas.tsx`)

- Detectar empleados con `tipo_jornada = 'semanal'`
- Para estos, calcular las horas esperadas como `horas_semanales_objetivo` en lugar de `dias * horas_jornada_estandar`
- Mostrar badge "Jornada Semanal" junto al nombre
- Mostrar el objetivo semanal en la info del empleado

#### 2. Balance Diario (`BalanceDiarioHoras.tsx`)

- Para empleados con jornada semanal, calcular el balance diario como `horas_semanales_objetivo / dias_laborales_semana` (ej: 36/6 = 6h promedio por dia)
- Agregar tooltip indicando que el balance real se mide semanalmente

#### 3. Configuracion de Jornada en Admin (`ReporteHorasTrabajadas.tsx`)

- En el dialog donde se configura `horas_jornada_estandar`, agregar selector de tipo de jornada (diaria/semanal)
- Si es semanal: mostrar campos de horas semanales y dias laborales
- Si es diaria: mantener el campo actual de horas por dia

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| **Migracion SQL** | Agregar columnas `tipo_jornada`, `horas_semanales_objetivo`, `dias_laborales_semana` a `empleados` |
| `src/components/fichero/ReporteHorasTrabajadas.tsx` | Actualizar calculo de horas esperadas y dialog de configuracion |
| `src/components/fichero/BalanceDiarioHoras.tsx` | Usar horas semanales / dias para el balance diario |
| `src/components/fichero/balance/BalanceTable.tsx` | Mostrar badge de jornada semanal |
| `src/components/fichero/balance/types.ts` | Agregar campo `tipo_jornada` al tipo |

### Flujo de uso

1. Ir a **Fichero > Horarios** y crear un turno de tipo "Flexible" con pausa maxima de 30 minutos
2. Asignar ese turno al empleado
3. Ir a **Fichero > Reporte Horas** y hacer clic en "Configurar" en el empleado
4. Cambiar tipo de jornada a "Semanal", poner 36 horas y 6 dias
5. El balance diario mostrara 6h como referencia diaria y el reporte semanal comparara contra las 36h totales

