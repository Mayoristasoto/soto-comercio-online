

## Problem Analysis

There are two issues:

1. **Novedades never show in the facial recognition direct action path** (`ejecutarAccionDirecta`). When the employee arrives late (which is the case since it's afternoon), the code at line 1323 shows `LlegadaTardeAlert` and then `return`s at line 1354. The novedades check only exists in the separate `procesarFichaje` function (line 861), which is a different code path. Even when the llegada tarde alert dismisses (line 2241), the `onDismiss` handler goes directly to tareas or reset -- it never fetches novedades.

2. **Countdown is too slow** -- user wants 2 real seconds instead of 5.

## Plan

### Step 1: Reduce countdown durations
- `LlegadaTardeAlert` in KioscoCheckIn.tsx: change `duracionSegundos={5}` to `duracionSegundos={2}` (line 2251)
- `CrucesRojasKioscoAlert`: change `duracionSegundos={5}` to `duracionSegundos={2}` (line 2207)
- `PausaExcedidaAlert`: change `duracionSegundos={3}` to `duracionSegundos={2}` (line 2228)

### Step 2: Add novedades fetch in `ejecutarAccionDirecta` (after llegada tarde check, around line 1459)
For the path where the employee is NOT late (i.e., no `return` at line 1354), add a novedades fetch before showing tareas, similar to what exists in `procesarFichaje` at line 861.

### Step 3: Chain novedades after llegada tarde dismissal
Modify the `LlegadaTardeAlert` `onDismiss` handler (line 2241) to fetch novedades BEFORE going to tareas/reset. The flow should be:
- Llegada Tarde dismisses → fetch novedades → if novedades exist, show `NovedadesCheckInAlert` → then tareas → then reset
- This ensures novedades are always shown even when the employee arrives late.

### Step 4: Also chain novedades after cruces rojas and pausa excedida dismissals
Same pattern for `CrucesRojasKioscoAlert` onDismiss (line 2203) and `PausaExcedidaAlert` onDismiss to ensure novedades are never skipped.

### Files to modify
- `src/pages/KioscoCheckIn.tsx` — all changes above

