

# Horarios sabatinos individuales por empleado

## Problema detectado

Dentro de un mismo turno, hay empleados con horarios sabatinos diferentes. Por ejemplo en "Manana Marti", Vera y Lan entran a las 07:30, pero Gomez Navarrete siempre entra a las 08:30. El campo `horarios_por_dia` actual esta en `fichado_turnos` (nivel turno), asi que no permite diferenciar por empleado.

## Solucion

### Paso 1: Agregar campo individual

Agregar `horarios_por_dia` (JSONB) a la tabla `empleado_turnos` para permitir excepciones por empleado. La logica sera: si el empleado tiene override en `empleado_turnos.horarios_por_dia`, usarlo; sino, usar el del turno (`fichado_turnos.horarios_por_dia`); sino, usar `hora_entrada/hora_salida` generales.

### Paso 2: Cargar los horarios sabatinos del turno (base)

Mantener los horarios a nivel turno como estan propuestos:
- Manana Marti: Sabado 07:30-16:00
- Turno 3: Sabado 07:30-16:00
- Tarde Marti: Sabado 08:00-16:30
- Turno 4: Sabado 07:30-14:30

### Paso 3: Cargar excepciones individuales

Empleados con horario sabatino distinto al de su turno:

| Empleado | Turno | Sabado individual |
|----------|-------|-------------------|
| Del Valle, Analia | Manana Marti | 08:00 - 16:00 |
| Romero, Jesica | Manana Marti | 08:00 - 16:00 |
| Gomez Navarrete, Julio | Manana Marti | 08:30 - 16:00 |
| Conforti, Ricardo | Tarde Marti | 08:30 - 16:30 |
| Merino, Matias | Tarde Marti | 08:30 - 16:30 |

Los demas empleados usan el horario sabatino del turno (sin override individual).

### Paso 4: Actualizar logica de lectura

Crear una funcion auxiliar `getHorarioDelDia(turno, empleadoTurno, diaSemana)` que priorice:
1. `empleado_turnos.horarios_por_dia[dia]` (override individual)
2. `fichado_turnos.horarios_por_dia[dia]` (override del turno)
3. `fichado_turnos.hora_entrada / hora_salida` (default)

Actualizar los componentes de reportes y puntualidad para usar esta funcion.

## Detalle tecnico

### Migracion SQL

```text
ALTER TABLE empleado_turnos 
ADD COLUMN horarios_por_dia JSONB DEFAULT NULL;
```

### Updates de datos (via insert tool)

4 updates a `fichado_turnos` para horarios sabatinos base (los ya propuestos).

5 updates a `empleado_turnos` para excepciones individuales con formato:
```text
{"6": {"hora_entrada": "08:30", "hora_salida": "16:00"}}
```

### Funcion auxiliar

Se creara `getHorarioDelDia()` en `src/lib/dateUtils.ts` y se usara en los componentes de fichaje, reportes y puntualidad.

