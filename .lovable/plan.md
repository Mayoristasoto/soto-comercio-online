

## Plan: Cargar Feriados Argentina 2026

### Feriados a cargar (16 en total)

Solo **feriados inamovibles y trasladables**, excluyendo dias no laborables (religiosos, armenios, turisticos):

| Fecha | Nombre | Tipo |
|-------|--------|------|
| 2026-01-01 | Año Nuevo | Inamovible |
| 2026-02-16 | Carnaval | Inamovible |
| 2026-02-17 | Carnaval | Inamovible |
| 2026-03-24 | Dia Nacional de la Memoria por la Verdad y la Justicia | Inamovible |
| 2026-04-02 | Dia del Veterano y de los Caidos en la Guerra de Malvinas | Inamovible |
| 2026-04-03 | Viernes Santo | Inamovible |
| 2026-05-01 | Dia del Trabajador | Inamovible |
| 2026-05-25 | Dia de la Revolucion de Mayo | Inamovible |
| 2026-06-15 | Paso a la Inmortalidad del Gral. Guemes | Trasladable (del 17/6) |
| 2026-06-20 | Paso a la Inmortalidad del Gral. Belgrano | Inamovible |
| 2026-07-09 | Dia de la Independencia | Inamovible |
| 2026-08-17 | Paso a la Inmortalidad del Gral. San Martin | Trasladable |
| 2026-10-12 | Dia del Respeto a la Diversidad Cultural | Trasladable |
| 2026-11-23 | Dia de la Soberania Nacional | Trasladable (del 20/11) |
| 2026-12-08 | Inmaculada Concepcion de Maria | Inamovible |
| 2026-12-25 | Navidad | Inamovible |

Fuente: [argentina.gob.ar/jefatura/feriados-nacionales-2026](https://www.argentina.gob.ar/jefatura/feriados-nacionales-2026)

### Implementacion

Un unico paso: insertar los 16 registros en la tabla `dias_feriados` con `activo = true` y `desactivar_controles = false` (para que el sistema de fichajes siga controlando asistencia en feriados, ya que justamente se asigna staff especial esos dias).

Nota: actualmente la tabla solo tiene 1 registro de prueba ("Prueba" del 2025-10-30). Los nuevos registros no lo afectan.

### Archivos modificados
Ninguno. Solo insercion de datos en la base.

