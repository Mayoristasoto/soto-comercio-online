# Ordenar eventos cronológicamente

En el Informe de Asistencia Gerencial, la tabla muestra los eventos sin orden por fecha (aparecen mezclados: 01/08, 27/07, 28/07, 30/07, 23/03).

## Cambio

- Ordenar la lista filtrada por fecha ascendente (más antiguo primero) y, dentro de la misma fecha, por apellido y nombre del empleado.
- El orden se aplica también a la exportación a PDF, que ya usa esta misma lista.

## Detalle técnico

En `src/pages/InformeAsistenciaGerencial.tsx`, dentro del `useMemo` de `eventosFiltrados`, agregar un `.sort()` final comparando `fecha` (formato `YYYY-MM-DD`, comparación de strings) y luego `apellido + nombre`.
