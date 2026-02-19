

# Aplicar horarios sabatinos a los 4 turnos

Se ejecutaran 4 actualizaciones en la tabla `fichado_turnos` para cargar los horarios del sabado (dia "6") en el campo `horarios_por_dia`:

| Turno | Sabado propuesto |
|-------|-----------------|
| Manana Marti | 07:30 - 16:00 |
| Turno 3 | 07:30 - 16:00 |
| Tarde Marti | 08:00 - 16:30 |
| Turno 4 | 07:30 - 14:30 |

## Detalle tecnico

Se usara el insert tool de Supabase para ejecutar 4 sentencias UPDATE sobre `fichado_turnos`, actualizando el campo JSONB `horarios_por_dia` con el formato `{"6": {"hora_entrada": "HH:MM", "hora_salida": "HH:MM"}}`.

Los turnos sin cambio (Turno 1, Telemarketing, Turno 5) no se modifican.

Despues de aplicar, podras ajustar manualmente desde **Fichero > Horarios > Gestion de Turnos** si algun valor necesita correccion.

