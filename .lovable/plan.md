## Objetivo

1. Bajar el umbral de redondeo: a partir de **19 minutos** de exceso se paga 0,5 h (antes era 20).
2. Mantener el recorte de entrada a las 09:00 (los minutos antes no se computan).
3. En el reporte (UI y PDF), mostrar por cada día una columna explícita **"Exceso real → Exceso pagado"** (ej.: `19 min → 30 min`, `25 min → 30 min`, `50 min → 1h`), para poder mostrárselo a los empleados.

## Nueva regla de redondeo (global)

| Exceso real | Pagado |
|---|---|
| 0 a 18 min | 0 |
| **19 a 44 min** | 0,5 h |
| 45 a 59 min | 1 h |
| 60+ min | 1 h + se vuelve a aplicar el redondeo sobre el resto |

## Cambios

### 1. `src/utils/reporteHorasExtrasPDF.ts`

- En `DEFAULT_CONFIG_HE`: `toleranciaMin: 19` (antes 20) y `redondeoUmbralMin: 19`.
- En `aplicarRedondeo()`: cambiar el corte `resto >= 20` por `resto >= 19`. El corte de `>= 45` queda igual.
- En `JornadaCalculada` agregar dos campos nuevos:
  - `excesoRealMin: number` — minutos crudos de exceso (después del clamp de 09:00, antes de tolerancia/redondeo).
  - `redondeoLabel: string` — texto listo para mostrar, ej: `"19 min → 30 min"`, `"50 min → 1h"`, `"12 min → 0"`.
- En `calcularJornadas()`, calcular ambos y guardarlos junto al resto.
- En `generarReporteHorasExtrasPDF()` (tabla "Detalle de jornadas con extras"):
  - Cambiar el header a: `["Fecha", "Empleado", "Sucursal", "Entrada", "Salida", "Base", "Exceso real", "Pagado", "Detalle"]`.
  - Para cada fila, agregar columnas con `excesoRealMin` formateado, `extraHs` formateado y `redondeoLabel`.
  - Considerar incluir también las jornadas con exceso > 0 aunque hayan quedado en 0 pagado (para que el empleado vea por qué no se le pagó). Filtro nuevo: `j.excesoRealMin > 0`.

### 2. `src/components/admin/payroll/ReporteHorasExtras.tsx`

- Subir `CONFIG_KEY` a `config_horas_extras_v4` para forzar el nuevo default `toleranciaMin: 19` en quienes ya tenían el v3 cacheado.
- Actualizar la `CardDescription` y el bloque de "Redondeo de fracciones" con la nueva tabla:
  - 0 a 18 min → no se computan
  - 19 a 44 min → 0,5 h
  - 45 a 59 min → 1 h
- En la tabla de "Detalle de jornadas" del UI, agregar columnas **Exceso real** y **Pagado / Detalle** con el mismo `redondeoLabel`.
- Mostrar también las filas con exceso real > 0 aunque el pagado sea 0, para transparencia.

### 3. Validación (caso Vera, Jonathan – Dom 03/05, 08:56 → 13:19)

- Clamp 09:00 → 4h 19m → exceso real **19 min** → pagado **30 min** → label `"19 min → 30 min"`.
- Caso 09:00 → 13:12 (12 min exceso) → label `"12 min → 0"`, no se paga.
- Caso 09:00 → 13:50 (50 min exceso) → label `"50 min → 1h"`.

## Resultado

- Regla más generosa con el empleado en el límite (19 ya cuenta).
- Reporte autoexplicativo: cada fila muestra cuántos minutos hizo y cuántos se le pagaron, con la conversión visible.
