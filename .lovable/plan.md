

# Ajustar horarios sabatinos por turno basado en promedios de fichajes reales

## Datos analizados (ultimos 4 sabados: 24/01, 31/01, 07/02, 14/02)

### Promedios calculados por turno

| Turno | Horario base (L-V) | Prom. entrada sabado | Prom. salida sabado | Sabado propuesto |
|-------|--------------------|-----------------------|---------------------|------------------|
| Turno 1 | 07:00-15:00 | ~06:55 | ~14:55 | 07:00-15:00 (sin cambio) |
| Manana Marti | 07:30-15:30 | ~07:40 | ~15:55 | 07:30-16:00 |
| Turno 3 | 08:00-16:00 | ~07:40 | ~15:55 | 07:30-16:00 |
| Tarde Marti | 10:30-18:30 | ~08:10 | ~16:20 | 08:00-16:30 |
| Turno 4 | 10:00-18:00 | ~07:30 | ~14:20 | 07:30-14:30 |
| Telemarketing | 08:00-14:00 | ~08:15 | ~14:15 | 08:00-14:00 (sin cambio) |
| Turno 5 | 10:30-18:30 | Sin datos | Sin datos | Sin cambio |

## Accion

Actualizar el campo `horarios_por_dia` en la tabla `fichado_turnos` con los horarios sabatinos (dia "6") para cada turno que tenga diferencia. Se usara la edge function existente para ejecutar los UPDATE. Los turnos sin cambio (Turno 1, Telemarketing, Turno 5) no se tocan.

### Turnos a actualizar (4 turnos):

```text
-- Manana Marti: Sabado 07:30-16:00
UPDATE fichado_turnos SET horarios_por_dia = '{"6":{"hora_entrada":"07:30","hora_salida":"16:00"}}'
WHERE id = '504177ae-e519-4c97-b686-329c0fb96c8d';

-- Turno 3: Sabado 07:30-16:00
UPDATE fichado_turnos SET horarios_por_dia = '{"6":{"hora_entrada":"07:30","hora_salida":"16:00"}}'
WHERE id = '9bd44d92-da2b-457b-80fd-59504e561257';

-- Tarde Marti: Sabado 08:00-16:30
UPDATE fichado_turnos SET horarios_por_dia = '{"6":{"hora_entrada":"08:00","hora_salida":"16:30"}}'
WHERE id = '8854ccd4-2982-4132-93a4-a0e365fa0752';

-- Turno 4: Sabado 07:30-14:30
UPDATE fichado_turnos SET horarios_por_dia = '{"6":{"hora_entrada":"07:30","hora_salida":"14:30"}}'
WHERE id = '6f216491-4bd3-41a2-afcd-c3988f6a055c';
```

## Despues de cargar los datos

Podras editar cada turno desde la seccion **Fichero > Horarios > Gestion de Turnos**, donde ya existe la interfaz de "Horarios especificos por dia" que muestra campos de entrada/salida para cada dia de la semana. Si algun valor no te convence, lo ajustas directamente desde ahi.

## Detalle tecnico

- Se usara la edge function `crear-tareas-batch` con accion `update` para ejecutar cada UPDATE sobre `fichado_turnos`
- El campo `horarios_por_dia` es JSONB y acepta el formato `{"6": {"hora_entrada": "HH:MM", "hora_salida": "HH:MM"}}` donde "6" = sabado
- No se requiere migracion de esquema, solo actualizacion de datos
- Los componentes de fichaje ya tienen soporte parcial para `horarios_por_dia`; la logica de lectura en reportes y puntualidad se actualizara para usar una funcion auxiliar `getHorarioDelDia()`

