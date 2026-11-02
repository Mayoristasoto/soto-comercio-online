# Recalcular incidencias pasadas

Nueva pestaña **Recalcular** dentro de Incidencias (solo Admin RRHH). Las incidencias que ya existen no se tocan hasta que vos valides.

## Cómo funciona
1. Elegís **mes** (y opcionalmente sucursal o empleado) y tocás **Recalcular**.
2. El sistema vuelve a revisar cada fichada del mes con el horario que rige **hoy** para ese día, en este orden: cambio de horario aprobado > Horario 2 publicado > horario fijo del empleado. También tiene en cuenta domingos, feriados, vacaciones y tolerancia vigente.
3. Te muestra una tabla comparando lo calculado antes contra lo nuevo, con cuatro resultados:
   - **Ya no es incidencia** (ej.: tenía llegada tarde pero el cambio retroactivo la anula) — propuesta: anular.
   - **Cambian los minutos** — propuesta: actualizar minutos y hora programada.
   - **Incidencia nueva** (antes no figuraba y ahora sí) — propuesta: crear.
   - **Sin cambios** — oculto por defecto.
   Cada fila muestra empleado, día, horario anterior, horario usado ahora y motivo (ej.: "Cambio de horario del 15/10").
4. Marcás qué filas aplicar (todas, por tipo o una por una), podés descartar cualquiera, y tocás **Validar y aplicar**.
5. Al aplicar: las anuladas quedan anuladas con motivo "Recálculo por cambio de horario retroactivo" (no se borran), se actualizan los minutos, se crean las nuevas y se ajustan las cruces rojas vinculadas. La escala mensual (aviso, llamado de atención, apercibimiento) se recalcula para esos empleados.
6. Cada recálculo queda guardado con fecha, quién lo hizo, qué se aplicó y qué se descartó, para poder revisarlo después.

## Alcance
- Llegadas tarde y excesos de descanso.
- Las incidencias ya justificadas se muestran pero no se modifican salvo que las marques.
- Las anotaciones (llamado de atención / apercibimiento) ya creadas no se borran solas: si la escala baja, te avisa en la tabla para que decidas.

## Detalles técnicos
- Tablas nuevas `recalculo_incidencias` (cabecera: mes, filtros, estado borrador/aplicado, autor) y `recalculo_incidencias_items` (empleado, fecha, tipo, valores antes/después, acción propuesta, decisión), con RLS solo admin_rrhh.
- RPC SECURITY DEFINER `recalcular_incidencias_preview(mes, sucursal, empleado)` que reutiliza la misma resolución de horario que `detectar_fichaje_tardio` / `kiosk_get_turno_empleado` y escribe solo en las tablas de recálculo.
- RPC `aplicar_recalculo_incidencias(recalculo_id, items[])` atómica sobre `fichajes_tardios`, `fichajes_pausas_excedidas` y `empleado_cruces_rojas` (anulación vía `anulada`/`motivo_anulacion`).
- Comparación y agrupación en módulo puro con pruebas (anula / cambia minutos / nueva / sin cambios).
