## Plan: ajustar horario de Jonathan Vera (solo martes y jueves)

### Contexto confirmado por el usuario
- Carga semanal: **48 hs** (no tocar).
- **Domingos:** son rotativos como horas extras, los arma el gerente sucursal cada viernes → **no se cargan en el turno fijo**.
- **Sábado** queda como está (07:30–15:30, igual al resto de días).
- Único cambio real: **martes y jueves pasan a 10:30–18:30** (sigue siendo 8 hs, así se mantienen las 48 hs semanales Lun-Sáb).

### Horario resultante

| Día | Horario |
|---|---|
| Lunes | 07:30 – 15:30 |
| Martes | **10:30 – 18:30** ← cambio |
| Miércoles | 07:30 – 15:30 |
| Jueves | **10:30 – 18:30** ← cambio |
| Viernes | 07:30 – 15:30 |
| Sábado | 07:30 – 15:30 |
| Domingo | — (rotativo, se carga aparte como hora extra) |

Total: 48 hs.

### Implementación (Opción A — `horarios_por_dia`)

Como el turno "Mañana Marti" lo comparten varios empleados, **no se edita el turno**: se setea el override solo en el registro `empleado_turnos` de Jonathan, usando el JSONB `horarios_por_dia` para pisar martes (2) y jueves (4):

```json
{
  "2": {"hora_entrada": "10:30", "hora_salida": "18:30"},
  "4": {"hora_entrada": "10:30", "hora_salida": "18:30"}
}
```

Lunes, miércoles, viernes y sábado siguen tomando los valores del turno base (07:30–15:30). `dias_semana` queda como está (sin domingo).

### Pasos
1. Buscar el `empleado_turnos.id` activo de Jonathan (`empleado_id = 5d23025c-613f-4774-8e63-f5c80a0acaa3`) para el turno "Mañana Marti".
2. `UPDATE empleado_turnos SET horarios_por_dia = '<jsonb de arriba>' WHERE id = ...` (vía herramienta de inserción de datos, no migración).
3. Validar en la UI del fichero/horarios que martes y jueves figuren 10:30–18:30 y el resto sin cambios.
4. (Opcional) Confirmar con un fichaje de prueba que `LlegadaTardeAlert` y la tolerancia de 1 min usen el nuevo horario en martes/jueves.

### Notas
- No requiere migración de schema: la columna `horarios_por_dia` ya existe y `ExportarHorarios.tsx` ya la respeta.
- No se toca el turno compartido, así que ningún otro empleado se ve afectado.
- Domingos: cuando el gerente arme la lista del viernes, se siguen cargando por el flujo actual de horas extras / turnos puntuales (fuera del alcance de este ajuste).
