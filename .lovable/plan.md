

## Plan: Cambiar horario y pausa de Merino Matias

### Situación actual
- Merino está asignado al turno **"Tarde Marti"** (10:30-18:30, pausa 40 min)
- Ese turno lo comparten 5 empleados (Carlos Espina, Noelia Tedesco, Ricardo Conforti, Maria Belen Castagnari y Merino)
- No se puede modificar el turno sin afectar a los otros 4

### Solución
Crear un **nuevo turno** exclusivo para Merino y reasignar su `empleado_turnos`.

**Paso 1 - Crear turno "Merino Custom"** en `fichado_turnos`:
- `hora_entrada`: 14:30
- `hora_salida`: 18:30
- `duracion_pausa_minutos`: 20
- `tolerancia_entrada_minutos`: 1
- Misma sucursal que "Tarde Marti"

**Paso 2 - Actualizar `empleado_turnos`**: cambiar el `turno_id` de Merino al nuevo turno.

### Operaciones (vía insert tool, no migración)
1. INSERT en `fichado_turnos` el nuevo turno
2. UPDATE en `empleado_turnos` para Merino (id: `cc37edfb-c356-4095-afc3-f010b1ba79db`) con el nuevo `turno_id`

Sin cambios de código ni de esquema.

