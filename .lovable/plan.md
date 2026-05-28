## Análisis: horario real de Jonathan Jesús Vera

Turno actual asignado: **"Mañana Marti" 07:30–15:30, Lun a Sáb**.

Analicé los fichajes de las últimas ~6 semanas (13/abr → 28/may) y el patrón real es muy estable, pero **no coincide con el turno asignado en 3 días**, y además trabaja domingo.

### Patrón real por día de la semana

| Día | Entrada real (prom.) | Salida real (prom.) | Coincide con turno actual |
|---|---|---|---|
| Lunes | 07:25 | 15:35 *(salvo 25/05 que salió 14:28)* | ✅ Sí |
| Martes | **10:25** | **18:32** | ❌ No |
| Miércoles | 07:23 | 15:37 | ✅ Sí |
| Jueves | **10:24** | **18:34** *(21/05 hizo turno partido 07:24-12:35 / 15:24-?)* | ❌ No |
| Viernes | 07:27 | 15:45 | ✅ Sí |
| Sábado | **08:27** | **16:40** | ❌ Entra 1h más tarde y sale 1h más tarde |
| Domingo | **08:52** | **13:13** | ❌ No tiene turno asignado pero trabaja |

### Estimación recomendada de horario ajustado

Manteniendo carga horaria semanal de ~8 hs los días largos y media jornada el domingo:

```text
Lunes      07:30 – 15:30   (8 hs)
Martes     10:30 – 18:30   (8 hs)
Miércoles  07:30 – 15:30   (8 hs)
Jueves     10:30 – 18:30   (8 hs)
Viernes    07:30 – 15:30   (8 hs)
Sábado     08:30 – 16:30   (8 hs)
Domingo    09:00 – 13:00   (4 hs)  ← media jornada
Total: 52 hs semanales
```

> Si la idea es **no superar 48 hs (LCT)**, una alternativa es dejar sábado 08:30–14:30 (6 hs) y domingo 09:00–13:00 (4 hs) ⇒ 50 hs, o quitarle un día de descanso compensatorio en semana.

### Cómo aplicar el cambio en el sistema

El turno actual `"Mañana Marti"` usa un único `hora_entrada / hora_salida` para todos los días marcados en `dias_semana`, por eso no puede representar tres bandas horarias distintas (07:30, 10:30 y fin de semana). Hay dos formas de reflejarlo:

1. **Opción A — usar `horarios_por_dia` (JSONB) del mismo turno** *(recomendada, ya soportada por el schema)*
   Editar el turno y cargar:
   ```json
   {
     "1": {"entrada":"07:30","salida":"15:30"},
     "2": {"entrada":"10:30","salida":"18:30"},
     "3": {"entrada":"07:30","salida":"15:30"},
     "4": {"entrada":"10:30","salida":"18:30"},
     "5": {"entrada":"07:30","salida":"15:30"},
     "6": {"entrada":"08:30","salida":"16:30"},
     "0": {"entrada":"09:00","salida":"13:00"}
   }
   ```
   Y agregar `0` (domingo) a `dias_semana`.

2. **Opción B — crear turnos individuales por día** usando overrides día-específicos (memoria *Day-Specific Overrides*) en `empleado_turnos`. Más granular pero más registros para mantener.

### Observaciones / dudas antes de tocar nada

- **Domingo:** ¿debe quedar formalizado como día laborable o es una excepción que conviene registrar como "horario excepcional"?
- **Carga semanal objetivo:** ¿52 hs reales está OK, o querés que ajuste a 48 hs?
- **Sábado:** ¿confirma que el horario "oficial" pasa a 08:30–16:30, o quería volver al 07:30?
- **Jueves 21/05** hizo turno partido (mañana + tarde). ¿Fue excepción puntual o se repite?

Respondé estas 4 dudas y armo el plan definitivo (Opción A vs B) y los pasos exactos para dejarlo aplicado.