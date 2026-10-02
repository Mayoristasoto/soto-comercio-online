# Cambio de horarios: Jonathan Vera y Tomás Díaz

## 1. Jonathan Jesus Vera (sucursal José Martí)
Hoy tiene un solo horario de lunes a sábado de 07:30 a 15:30.
Nuevo esquema, a partir del lunes 5/10:
- **Lunes, miércoles y viernes:** 07:30 a 15:30 (se queda el horario actual, sin martes ni jueves).
- **Martes y jueves:** 10:30 a 18:30 (horario nuevo "Tarde Martí - J. Vera").
- **Sábado:** queda como está hoy (07:30 a 15:30), salvo que me digas otra cosa.

Desde ese día, las llegadas tarde de martes y jueves se miden contra las 10:30.

## 2. Tomás Javier Díaz (Administración)
Hoy tiene cargado 07:00 a 15:00, pero en realidad entra a las 07:30.
- **Corrección hacia atrás:** del 10/9 al 30/9 (los últimos 21 días de septiembre) se toma como horario 07:30 a 15:30.
- Se recalculan sus llegadas tarde de esos días: unas 16 llegadas de ~30 min desaparecen. Solo quedan las que fueron después de las 07:30 (por ejemplo el 16/9 a las 10:32, el 20/9, 22/9, 24/9, 25/9 a las 13:02, 27/9 y 29/9), con los minutos recalculados.
- Las cruces rojas y anotaciones automáticas que se generaron por esos atrasos se ajustan igual.
- **Desde octubre en adelante:** queda 07:30 a 15:30 fijo.
- Del 1/9 al 9/9 queda como está (07:00).

## Detalles técnicos
- Jonathan: crear `fichado_turnos` "Tarde Martí - J. Vera" (10:30–18:30, dias_semana [2,4]); al turno actual dejarle [1,3,5,6]; asignar el nuevo en `empleado_turnos` con fecha_inicio 2026-10-05.
- Tomás: cerrar la asignación actual "Admin" con fecha_fin 2026-09-09; crear turno 07:30–15:30 asignado desde 2026-09-10 (activo).
- En `fichajes_tardios` (10/9–30/9): borrar los registros con hora_real <= 07:30 y recalcular `hora_programada` y `minutos_retraso` del resto; limpiar/ajustar `empleado_cruces_rojas` y anotaciones automáticas vinculadas.
- Solo cambios de datos, sin cambios en pantallas.
