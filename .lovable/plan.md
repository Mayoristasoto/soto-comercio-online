

# Informe de Fichajes - Ultimos 3 Sabados + Plan de Horarios Diferenciados

## Informe: Fichajes reales vs horarios asignados

### Turnos asignados actualmente (iguales L-V y Sabado)

| Turno | Horario | Empleados |
|-------|---------|-----------|
| Turno 1 | 07:00 - 15:00 | Bartolo Loyola |
| Manana Marti | 07:30 - 15:30 | Chumpitaz, Del Valle, Gomez Navarrete, Lan, Rincon, Romero, Vera, Voikli |
| Turno 3 | 08:00 - 16:00 | Carrion |
| Tarde Marti | 10:30 - 18:30 | Castagnari, Conforti, Espina, Merino, Tedesco |
| Turno 4 | 10:00 - 18:00 | Fernandez |
| Telemarketing | 08:00 - 14:00 (L-V) | Galaz |

### Sabado 14/02/2026

| Empleado | Turno asignado | Entrada real | Salida real | Horas | Diferencia con turno |
|----------|---------------|-------------|-------------|-------|---------------------|
| Bartolo Loyola | 07:00-15:00 | 07:04 | 14:55 | 7.8h | OK - cumple turno |
| Carrion | 08:00-16:00 | 07:35 | 15:31 | 7.9h | Entro 25 min antes |
| Castagnari | **10:30-18:30** | **08:22** | **16:45** | 8.4h | **Entro 2h antes, salio 1:45h antes** |
| Chumpitaz | 07:30-15:30 | 07:02 | 14:52 | 7.8h | OK - cumple turno |
| Conforti | **10:30-18:30** | **08:29** | **16:45** | 8.3h | **Entro 2h antes, salio 1:45h antes** |
| Del Valle | 07:30-15:30 | 08:04 | 16:36 | 8.5h | Similar |
| Diaz | -- | 07:27 | 15:36 | 8.2h | Sin turno asignado |
| Espina | **10:30-18:30** | **07:21** | **15:31** | 8.2h | **Entro 3h antes, salio 3h antes** |
| Fernandez | **10:00-18:00** | **07:35** | **13:01** | 5.4h | **Entro 2.5h antes, salio 5h antes** |
| Galaz | 08:00-14:00 (L-V) | 08:10 | Sin salida | -- | No tiene sabado asignado |
| Gomez Navarrete | 07:30-15:30 | 08:25 | 16:52 | 8.5h | Similar |
| Lan | 07:30-15:30 | 07:25 | 15:36 | 8.2h | OK - cumple turno |
| Merino | **10:30-18:30** | **08:30** | **16:48** | 8.3h | **Entro 2h antes, salio 1:42h antes** |
| Romero | 07:30-15:30 | 07:52 | 16:44 | 8.9h | Se quedo 1h mas |
| Vera | 07:30-15:30 | 07:23 | 15:37 | 8.2h | OK - cumple turno |

### Sabado 07/02/2026
Patron similar: los empleados de Tarde Marti y Turno 4 entraron entre 07:00-08:30 y salieron entre 14:00-16:35.

### Sabado 31/01/2026
Mismo patron confirmado en las 3 semanas.

---

## Hallazgo principal

Los empleados del turno **"Tarde Marti" (10:30-18:30)** y **"Turno 4" (10:00-18:00)** trabajan un horario completamente diferente los sabados: entran entre **07:00-08:30** y salen entre **15:00-17:00**. Los del turno de manana mantienen horarios similares.

---

## Plan de modificacion de horarios

### Solucion propuesta

La tabla `fichado_turnos` ya tiene un campo **`horarios_por_dia`** (JSONB, actualmente vacio) disenado exactamente para esto. Se cargara con horarios especificos para el sabado (dia 6).

### Cambios a realizar

**1. Actualizar `horarios_por_dia` en los turnos afectados via migracion SQL:**

```text
-- Tarde Marti: Sabados de 08:00 a 16:30 (en vez de 10:30-18:30)
UPDATE fichado_turnos 
SET horarios_por_dia = '{"6": {"hora_entrada": "08:00", "hora_salida": "16:30"}}'
WHERE nombre = 'Tarde Marti' AND activo = true;

-- Turno 4: Sabados de 07:30 a 13:00 (en vez de 10:00-18:00)
UPDATE fichado_turnos 
SET horarios_por_dia = '{"6": {"hora_entrada": "07:30", "hora_salida": "13:00"}}'
WHERE nombre = 'Turno 4' AND activo = true;
```

**2. Modificar la logica de fichaje** para que al evaluar puntualidad y horarios, consulte primero `horarios_por_dia[dia_semana]` antes de usar `hora_entrada`/`hora_salida` generales. Los componentes afectados:

- `BalanceDiarioHoras` / `ReporteHorasTrabajadas`: al calcular horas esperadas
- `FicheroFacialAuth` / `FicheroPinAuth`: al validar llegada tarde
- `evaluar-puntualidad` (edge function): al determinar tolerancias
- `ReporteDiarioAsistencia`: al listar ausencias

**3. Crear funcion auxiliar** `getHorarioDelDia(turno, fecha)` que devuelve el horario correcto segun el dia de la semana, revisando `horarios_por_dia` primero y cayendo al horario general como fallback.

### Horarios sabatinos propuestos (basados en fichajes reales)

| Turno | L-V | Sabado propuesto |
|-------|-----|-----------------|
| Turno 1 | 07:00-15:00 | Sin cambio |
| Manana Marti | 07:30-15:30 | Sin cambio |
| Turno 3 | 08:00-16:00 | 07:30-15:30 (opcional) |
| **Tarde Marti** | **10:30-18:30** | **08:00-16:30** |
| **Turno 4** | **10:00-18:00** | **07:30-13:00** |
| Telemarketing | 08:00-14:00 | No trabaja sabados |

### Archivos a modificar

- Migracion SQL para cargar `horarios_por_dia`
- `src/lib/dateUtils.ts` o nuevo util: funcion `getHorarioDelDia()`
- Componentes de balance/reportes que consultan hora_entrada/hora_salida del turno
- Edge function `evaluar-puntualidad` para considerar horarios por dia

