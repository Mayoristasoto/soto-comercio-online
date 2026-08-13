# Justificación simple de ausencias + revisión semanal

## Objetivo
1. Hacer que justificar ausencias/llegadas tarde sea rápido (1-2 clics).
2. Agregar filtros útiles: empleado, mes, semana, tipo, sucursal, estado.
3. Al cerrar cada semana, generar una tarea de "justificar ausencias de la semana" para RRHH y para cada encargado.

## Propuestas de simplificación (todas incluidas)

**A. Barra de períodos rápidos**
Botones: `Esta semana`, `Semana pasada`, `Este mes`, `Mes pasado`, `Últimos 3 meses`, más selectores explícitos de **Mes** y **Semana (ISO)** que fijan el rango automáticamente. El rango manual Desde/Hasta queda como opción avanzada.

**B. Filtro por empleado directo**
Además del selector de grupos actual, un combo de empleado único (buscable) para ir directo a un caso.

**C. Vista agrupada por semana**
La tabla se agrupa por semana (encabezado "Semana 03/08 – 09/08 · 12 eventos · 5 pendientes") con botón *Justificar toda la semana* por empleado/grupo.

**D. Justificación en 1 clic**
En cada fila, chips de los motivos más usados (Vacaciones, Licencia médica, Turno médico, Franco, Corte de luz, Transporte). Un clic aplica el motivo; clic de nuevo lo quita. El resto de motivos queda en el desplegable actual.

**E. Autodetección (sugerencias)**
Si la fecha del evento cae dentro de una vacación aprobada/gozada, una licencia médica (`ausencias_medicas`) o una solicitud general aprobada, la fila muestra la etiqueta sugerida (ej. "Vacaciones aprobadas") y un botón *Aplicar sugerencia*. También un botón masivo **Autojustificar detectadas** que aplica todas las sugerencias de la vista. Nunca se aplica solo sin confirmación.

**F. Filtro extra "Origen"**
`Todos / Con vacación o licencia detectada / Sin respaldo` para separar lo que ya tiene explicación de lo que hay que preguntar al encargado.

## Tarea semanal de revisión

- Al finalizar cada semana (lunes temprano, hora Argentina) se generan tareas: una para RRHH (todas las sucursales) y una por sucursal para su encargado, con título "Justificar ausencias semana DD/MM – DD/MM".
- La tarea sólo se crea si esa semana tiene eventos pendientes de justificar en el alcance correspondiente.
- La descripción incluye la cantidad de pendientes y un enlace al informe con la semana ya filtrada.
- Si al abrirse el informe con esa semana no quedan pendientes, se ofrece marcar la tarea como completada; también se completa automáticamente cuando los pendientes de la semana llegan a cero.

## Detalles técnicos

- `src/pages/InformeAsistenciaGerencial.tsx`: nuevos filtros (períodos rápidos, mes, semana ISO, empleado único, origen), agrupado por semana, chips de motivos frecuentes, sugerencias y acción "Autojustificar detectadas". Soporta parámetros de URL `?desde=&hasta=&sucursal=` para el enlace de la tarea.
- Nueva RPC `get_sugerencias_justificacion(p_desde, p_hasta, p_empleados)` (SECURITY DEFINER, search_path fijo) que devuelve por empleado/fecha si hay vacación aprobada/gozada, licencia médica o solicitud general aprobada.
- Los eventos de tipo `ausencia` hoy usan `gen_random_uuid()` como id, por lo que cambian en cada carga: se usará la clave estable `tipo_evento|empleado_id|fecha` para selección y upsert (la tabla `justificaciones_asistencia` ya tiene ese índice único).
- Nueva RPC `generar_tareas_justificacion_semana(p_desde, p_hasta)` que cuenta pendientes por sucursal y crea filas en `tareas` (usando `fecha_limite` y `asignado_a`) evitando duplicados por semana/sucursal.
- Cron semanal con `pg_cron` (lunes 09:00 ART = 12:00 UTC) invocando esa RPC para la semana cerrada.
- Motivos frecuentes: se agrega un flag `frecuente` en `categorias_justificacion_asistencia` (editable desde el diálogo de Categorías existente) para decidir qué chips se muestran.
