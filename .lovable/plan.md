# Limpieza de llegadas tarde de sábados — José Martí (agosto y septiembre)

## Lo que encontré
Llegadas tarde registradas en sábados, comparadas con el horario correcto (07:30 u 08:30):

| Empleado | Sábados con tarde | Falsas (entró a horario) | Reales |
|---|---|---|---|
| Jonathan Vera (08:30) | 9 | 7 | 2 |
| Julio Gómez (08:30) | 9 | 6 | 3 |
| Joseph Chumpitaz (08:30) | 1 | 1 | 0 |
| Jésica Romero (07:30) | 5 | 0 | 5 |
| Laura Lan (07:30) | 1 | 0 | 1 |

Carlos, Ricardo, Romina y Silvia no tienen llegadas tarde de sábado en esos meses.

## Qué voy a hacer
1. Borrar las **14 llegadas tarde falsas** (entrada a 08:30 o antes para el grupo 08:30).
2. Recalcular las **reales** de Jonathan, Julio contra 08:30 (los minutos bajan).
3. Anular las **cruces rojas** de esos sábados que ya no corresponden y ajustar minutos de las que quedan.
4. Las de Jésica y Laura quedan como están (fueron atrasos reales contra 07:30).
5. Mostrarte al final el listado: fecha, hora de entrada, qué se borró y qué quedó, para tu reunión.

No toco fichajes ni días de semana. Las anotaciones de legajo automáticas te las listo para que decidas.

## Detalle técnico
- `fichajes_tardios`: delete donde dow=6, sucursal Martí, 2026-08-01..09-30, hora_real <= 08:30 para grupo 08:30; update `hora_programada='08:30'` y `minutos_retraso` del resto.
- `empleado_cruces_rojas` tipo llegada_tarde mismas fechas/empleados: `anulada=true` para las borradas, actualizar `minutos_diferencia` para las recalculadas.
