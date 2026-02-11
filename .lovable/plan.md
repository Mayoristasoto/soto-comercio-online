

# Resumen del Dia - Version Premium para Fichero

Se va a reemplazar el componente `BalanceDiarioHoras.tsx` con una version significativamente mejorada que incluya un panel de resumen ejecutivo del dia ademas de la tabla detallada.

## Mejoras principales

### 1. Panel de Resumen Ejecutivo (nuevo, arriba de todo)

Tarjetas grandes con metricas clave del dia:
- **Total empleados activos** vs empleados que ficharon (con porcentaje de presentismo)
- **Jornadas completas** con barra de progreso visual
- **Sin registrar salida** (alerta naranja)
- **Horas totales trabajadas** (suma de todo el equipo)
- **Promedio por empleado** (horas efectivas promedio)
- **Balance global** del dia: total horas extras o deficit del equipo completo

### 2. Grafico visual de distribucion (nuevo)

Un mini grafico de barras horizontales (usando recharts, ya instalado) mostrando:
- Distribucion por estado: completo / sin salida / no ficho
- Top 5 empleados con mas horas extra y top 5 con mas deficit

### 3. Tabla mejorada

- Agregar **avatar** del empleado
- Agregar columna **Horas efectivas** (trabajadas menos pausa, mas claro)
- Colores de fondo en filas segun balance: verde suave para horas extra, rojo suave para deficit
- Ordenamiento clickeable por columna (nombre, sucursal, balance)
- Filtro rapido por estado (completo, sin salida, no ficho)
- Indicador visual de **hora entrada programada vs real** (puntualidad)
- Tooltip en la diferencia mostrando el desglose

### 4. Resumen por sucursal (nuevo)

Seccion colapsable que agrupa los datos por sucursal mostrando:
- Cantidad de empleados presentes por sucursal
- Promedio de horas por sucursal
- Balance total por sucursal

## Detalle tecnico

### Archivos a modificar

| Archivo | Accion |
|---------|--------|
| `src/components/fichero/BalanceDiarioHoras.tsx` | Reescribir con todas las mejoras |

### Datos utilizados (sin cambios de BD)

- Tabla `empleados`: id, nombre, apellido, avatar_url, horas_jornada_estandar, sucursal_id, activo
- Tabla `fichajes`: empleado_id, tipo, timestamp_real
- Tabla `sucursales`: id, nombre
- Tabla `empleado_turnos` + `fichado_turnos`: hora_entrada programada (para puntualidad)

### Componentes reutilizados

- `recharts` (BarChart) para grafico de distribucion
- `ExportButton` para exportacion
- Avatar de Radix UI
- Calendar, Popover, Select (ya usados)
- Accordion de Radix para seccion por sucursal colapsable

### Logica de ordenamiento

Se agrega estado local `sortBy` y `sortDir` para permitir ordenar la tabla por cualquier columna clickeando en el encabezado.

### Filtro por estado

Se agrega un grupo de botones toggle para filtrar rapidamente: "Todos", "Completos", "Sin salida", "No ficharon".

No se requieren cambios en la base de datos ni migraciones SQL.

