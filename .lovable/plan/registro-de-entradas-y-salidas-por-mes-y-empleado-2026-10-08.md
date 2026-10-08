# Registro de Entradas y Salidas (por mes y empleado)

## Qué vas a ver
Una pestaña nueva **"Entradas y Salidas"** dentro de Fichero (junto a Historial). Muestra solo la primera entrada y la última salida de cada día, sin pausas ni otros datos.

## Filtros
- **Mes:** por defecto el mes actual.
- **Empleado:** uno, varios o todos, con buscador.
- **Sucursal:** opcional.
- **Solo con problemas:** muestra únicamente las llegadas tarde, las salidas temprano y los días incompletos.

## Columnas (una fila por empleado y día)
| Fecha | Empleado | Horario | Entrada real | Llegó tarde | Salida real | Se fue antes | Jornada total |
|---|---|---|---|---|---|---|---|
| 06/10 | Juan Pérez | 07:30–15:30 | 07:34 | +4 min (rojo) | 15:25 | -5 min (naranja) | **07:51** |

- **Jornada total:** tiempo entre la entrada y la salida, en formato HH:MM. Por ejemplo, 07:55 si se fue 5 minutos antes en una jornada de 8 horas.
  - Opción para mostrarla **descontando el tiempo de descanso**. Así se compara directamente con el horario asignado.
  - El total se compara con el horario: verde si se cumplió, rojo si faltó tiempo.
- **Llegó tarde y Se fue antes:** se calculan contra el horario que tenía asignado ese día. Respetan los cambios de horario por día, como los sábados, y usan tolerancia 0.
- **Casos especiales:** sin salida, sin entrada o día no trabajado. Se marcan si correspondía trabajar; los domingos y feriados se omiten.

## Totales por empleado (arriba de la tabla)
Días trabajados, cantidad de llegadas tarde y minutos acumulados, cantidad de salidas temprano y minutos acumulados, y horas totales del mes.

## Exportar
- **Excel:** una hoja con el detalle diario y otra con el resumen por empleado.
- **PDF:** con los colores de la empresa, agrupado por empleado. Sirve para las reuniones individuales.

## Detalles técnicos
- Componente nuevo `src/components/fichero/RegistroEntradasSalidas.tsx` como pestaña en la página de Fichero.
- Datos: `fichajes` de tipo entrada y salida del mes. Se toma la primera entrada y la última salida de cada día en hora Argentina (`dateUtils`). El horario esperado sale de `empleado_turnos` y `fichado_turnos`, incluidas las variantes por día, con la misma lógica que el informe de puntualidad.
- Se paginan los resultados para pasar el límite de 1000 filas.
- Para exportar se usan `xlsx` y `jspdf-autotable` en un util nuevo `src/utils/entradasSalidasExport.ts`.
- No hay cambios en la base de datos.
