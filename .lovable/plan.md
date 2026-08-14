# Índice de ausentismo por empleado y por mes

Nueva sección en RRHH que mide, mes a mes, cuánto falta cada empleado y detecta si esas faltas siguen un patrón (día de la semana, vísperas de fin de semana largo/feriado, o coincidencia con vacaciones de compañeros).

## Qué se va a ver

**Ruta nueva:** `/rrhh/indice-ausentismo` (link en el sidebar de RRHH, junto a Resumen Mes e Informe Gerencial).

Filtros: rango de meses (por defecto últimos 12), sucursal, grupo de empleados / empleado único (mismo selector que el informe gerencial), y switch "contar solo ausencias sin justificar".

1. **Matriz empleado × mes**
   - Una fila por empleado, una columna por mes, coloreada por intensidad (heatmap): verde bajo, amarillo medio, rojo alto.
   - Cada celda muestra el índice `% = días ausentes / días esperados` y, al pasar el mouse, el detalle (ausentes, esperados, justificadas, sin justificar).
   - Columna final con el índice acumulado del período y la tendencia (últimos 3 meses vs. anteriores).

2. **Panel de patrones (por empleado, al hacer clic en su fila)**
   - Distribución por día de la semana: identifica quien falta sistemáticamente lunes o sábados.
   - Vísperas y días posteriores a feriado o fin de semana largo: cuántas de sus ausencias caen ahí y qué porcentaje del total representan.
   - Coincidencia con vacaciones de otros: cuántas ausencias ocurrieron en días en que compañeros de su misma sucursal estaban de vacaciones/licencia.
   - Motivos: desglose por categoría de justificación (enfermedad, turno médico, corte de luz, sin justificar, etc.) para distinguir "se enferma seguido" de "falta sin aviso".
   - Reincidencia: rachas de ausencias consecutivas y meses consecutivos con índice por encima de su propio promedio.

3. **Ranking y alertas**
   - Top empleados por índice del período, y chips de alerta: "patrón día de semana", "vísperas de feriado", "alta tasa de enfermedad", "sin justificar".

4. **Exportación**
   - Excel con hojas: `Matriz mensual`, `Detalle diario`, `Patrones`. PDF ejecutivo con la matriz y el ranking, con el estilo corporativo ya usado en los otros informes.

## Detalles técnicos

- **Fuente de datos:** una nueva RPC `get_indice_ausentismo(p_desde, p_hasta, p_sucursales, p_empleados)` que recorre `get_novedades_liquidacion` (ya devuelve un registro por día con `estado`, `hora_entrada_esperada` y `horas_esperadas`). Los días esperados son las filas con turno asignado; las ausencias son las filas con `estado = 'NO_FICHADA'`. Se hace `LEFT JOIN` con `justificaciones_asistencia` + `categorias_justificacion_asistencia` para traer motivo y `es_justificada`, igual que hace `get_eventos_asistencia`.
- Estados como `VACACIONES`, `LIC_MEDICA`, `FERIADO` no cuentan como ausencia ni como día esperado, para que las vacaciones no inflen el índice.
- La RPC devuelve granularidad diaria (empleado, fecha, día de semana, esperado sí/no, ausente sí/no, categoría). La agregación mensual, los patrones y el ranking se calculan en el cliente con `useMemo`, para poder reaccionar a los filtros sin nuevas consultas.
- **Vísperas de feriado / fin de semana largo:** se cruza la fecha con `dias_feriados` (activos) marcando día anterior, día posterior y el propio feriado.
- **Coincidencia con vacaciones de terceros:** se consultan `solicitudes_vacaciones` (aprobadas/gozadas) del período y se marca, por sucursal y fecha, cuántos compañeros estaban ausentes por vacaciones.
- Archivos nuevos: `src/pages/IndiceAusentismo.tsx`, `src/components/ausentismo/MatrizAusentismo.tsx`, `src/components/ausentismo/PatronesEmpleadoDialog.tsx`, `src/utils/indiceAusentismoExport.ts` (Excel + PDF). Ruta en `src/App.tsx` y link en el sidebar de RRHH.
- Todas las fechas se manejan con la zona horaria de Argentina y parseo `T00:00:00`, como en el resto del sistema.
