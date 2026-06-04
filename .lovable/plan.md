## Cargar vacaciones 2026 en el informe ejecutivo

### Empleados detectados

| Detalle pasado | Empleado en la base | Estado |
|---|---|---|
| NAVARRETE JULIO | **Julio Cesar Gomez Navarrete** | activo ✅ |
| DEL VALLE ANALIA | **Analia Victoria Del Valle** | activo ✅ |
| GALAZ AGUSTINA | **Agustina Lucía Galaz** | activo ✅ |
| JUSTINIANO GONZALO | **Gonzalo Justiniano** | activo ✅ |
| LAN LAURA | **Laura Lorena Lan** | activo ✅ |
| DIAZ TOMAS | **Tomás Javier Diaz** (hay otro "Tomas Diaz" inactivo, lo descarto) | activo ✅ |

Si alguno no es el correcto, avisame antes de aplicar.

### Qué voy a hacer (año 2026)

**1) Insertar 6 solicitudes en `solicitudes_vacaciones`** con `estado='aprobada'`, motivo "Carga manual vacaciones 2026":

| Empleado | Desde | Hasta | Días |
|---|---|---|---|
| Gomez Navarrete, Julio | 2026-01-05 | 2026-01-18 | 14 |
| Del Valle, Analia | 2026-01-19 | 2026-02-01 | 14 |
| Galaz, Agustina | 2026-01-19 | 2026-02-01 | 14 |
| Justiniano, Gonzalo | 2026-03-02 | 2026-03-08 | 7 |
| Lan, Laura | 2026-05-11 | 2026-05-17 | 7 |
| Diaz, Tomás | 2026-05-18 | 2026-05-31 | 14 |

**2) Justificar ausencias en `justificaciones_asistencia`** con la categoría existente **Vacaciones** (id `7a737f02…`), una fila por cada día del rango y por cada empleado (`tipo_evento='ausencia'`, `observacion='Vacaciones 2026 - carga manual'`). Se usa `ON CONFLICT DO NOTHING` para no duplicar si ya hay justificación ese día.

Esto hace que en el informe ejecutivo esos días aparezcan con el tag verde **Vacaciones** en vez de "Sin justificar".

### Lo que NO se toca
- No se modifican fichajes existentes.
- No se descuenta saldo en `vacaciones_saldo` (cargas históricas/manuales, no consumen cupo automático). Avisame si querés que también descuente.
- No se cambia código de la app, sólo datos.
