# Planificación semanal por día (cobertura de vacaciones y ausencias)

Extender la "Planificación del día" que ya existe en Fichero → Horarios para poder armar los 7 días de una semana concreta, guardarla como una planificación semanal con fecha, y opcionalmente aplicar esos horarios a esa semana y a esos empleados.

## Cómo va a funcionar

1. **Selector de semana**: elegís una semana (lunes a domingo) con navegación anterior/siguiente. Se ve una barra con los 7 días y un indicador de cuántos empleados y horas tiene cada día.
2. **Armado día por día**: al entrar a un día se usa la misma pantalla de planificación actual (tramos, horario cortado, multi-sucursal, pausas, horas extras con costo, cobertura por hora, cobertura por hora y sucursal, gráfico de horarios). Cada día arranca precargado con los turnos asignados actuales y vos ajustás para cubrir vacaciones/ausencias.
3. **Guardar como planificación semanal**: un botón "Guardar semana" persiste los 7 días en base de datos con nombre, notas y estado (borrador / confirmada). Podés volver a abrirla y seguir editándola.
4. **Copiar de otra semana**: podés crear una semana nueva copiando una planificación semanal ya guardada (se recalculan las fechas) y después ajustar.
5. **Aplicar a la semana (opcional)**: botón "Aplicar horarios" que genera los horarios reales solo para esos días y esos empleados, usando el mecanismo de cambios de horario ya existente (no toca los turnos permanentes). Muestra un resumen previo (cuántas filas se crean/reemplazan) y pide confirmación. Se puede revertir eliminando lo aplicado.
6. **Exportar**: PDF/Excel de la semana completa (una hoja/página por día con KPIs, cobertura y gráfico, igual que el export del día actual) más un resumen semanal de horas por empleado y por sucursal.
7. **Indicadores de ausencia**: en cada día se marcan empleados de vacaciones/licencia para que sepas qué hay que cubrir, y el conteo de cobertura avisa si un día queda por debajo de lo esperado.

## Detalles técnicos

- Reutilizar las tablas existentes `planificacion_semanal` (fecha_inicio_semana, estado, notas) y `planificacion_semanal_detalle` (empleado_id, sucursal_id, dia_semana, hora_entrada, hora_salida).
- Migración necesaria sobre `planificacion_semanal_detalle`: agregar `pausa_minutos int default 0`, `horas_extras numeric default 0`, `valor_hora_extra numeric null`, `notas text null` y permitir varias filas por empleado/día (tramos). Sobre `planificacion_semanal`: agregar `nombre text` y `aplicada_at timestamptz null`. Mantener RLS/grants ya existentes (admin/gerentes).
- Refactor de `useDiaBorrador.ts`: mantener el borrador local por fecha, y sumar carga/volcado desde y hacia `planificacion_semanal_detalle` (nuevo hook `usePlanificacionSemana` que orquesta los 7 días).
- Extraer el cuerpo de `VistaDiaPlanificacion.tsx` en un componente reutilizable de un día, y crear `VistaSemanaPlanificacion.tsx` con el selector de semana, el resumen semanal y las acciones (guardar / copiar / aplicar / exportar).
- "Aplicar horarios" escribe en `cambios_horario` (una fila por empleado/fecha/tramo) mediante una función `aplicar_planificacion_semanal(planificacion_id)` con SECURITY DEFINER y search_path fijo, idempotente por planificación.
- Export: generalizar `src/utils/horariosDiaExport.ts` para iterar los días de la semana y agregar la hoja de resumen semanal.
- Fechas siempre en zona Argentina vía `src/lib/dateUtils.ts`; semanas de lunes a domingo.
