## Objetivo

Que los minutos fichados antes del horario de entrada pactado **no se computen** como tiempo trabajado en el reporte de horas extras. Solo se cuenta desde la hora de entrada en adelante.

Ejemplo: si un empleado ficha entrada 08:42 y salida 17:10, se calcula como si hubiera entrado 09:00 → 8h 10min, no 8h 28min.

## Regla acordada

- **Hora de entrada de referencia**: 09:00 para todos los días (incluyendo domingos).
- **Domingos**: jornada base 4h (09:00 → 13:00).
- **Demás días**: jornada base 8h.
- **Salida**: NO se recorta. Se toma la salida real fichada (las horas extra se cuentan después de la jornada pactada).
- Si el empleado ficha entrada **después** de las 09:00, se usa esa entrada real (no se le "regala" tiempo).

## Cambios

### 1. `src/utils/reporteHorasExtrasPDF.ts`

Agregar a `ConfigHorasExtras` un campo nuevo:
- `horaEntradaRef: string` (formato `"HH:MM"`, default `"09:00"`)

En `calcularJornadas()`, antes de calcular `brutasHs`:
- Construir el timestamp de entrada de referencia para esa fecha en zona Argentina (ej: `2026-04-26T09:00:00-03:00`).
- Tomar `entradaEfectiva = max(entradaReal, entradaReferencia)`.
- Calcular `brutasHs = (salidaReal - entradaEfectiva) / 3600000`, con piso en 0.
- El resto de la lógica (base, tolerancia, redondeo) queda igual.

### 2. `src/components/admin/payroll/ReporteHorasExtras.tsx`

- Subir versión de localStorage a `config_horas_extras_v3` para que tomen el nuevo default.
- Agregar input "Hora entrada de referencia" en Parámetros de cálculo (default 09:00) — opcional, por si en el futuro se quiere ajustar.
- Actualizar la `CardDescription` aclarando: *"Los minutos trabajados antes de la hora de entrada de referencia (09:00) no se computan."*

## Resultado esperado

- Domingo 09:00 → 13:28 → base 4h + 28min extra → con redondeo: 0,5h extra.
- Si ficha 08:40 → 13:28 → se considera 09:00 → 13:28 → mismo resultado (0,5h).
- Día hábil 08:30 → 17:45 → se considera 09:00 → 17:45 → 8h 45min → 1h extra (≥45 min).
