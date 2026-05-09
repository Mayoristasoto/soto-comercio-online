## Objetivo
Generar `reporte_horas_extras_v4.pdf` ajustando el cálculo de domingos: la jornada estándar de domingo es de **9:00 a 13:00 (4 horas)**, por lo tanto las horas extras de domingo son las que excedan esas 4 horas (no 8 como en días de semana). Además, marcar claramente cada fila de domingo como "JORNADA DOMINGO" ya que el valor de la hora es diferente.

## Cambios respecto a v3
1. **Cálculo diferenciado por tipo de día**:
   - Lunes a sábado: `extra = horas_brutas − 8`
   - Domingo: `extra = horas_brutas − 4` (jornada estándar 9 a 13)
2. **Etiquetado claro**:
   - Filas de domingo con etiqueta destacada "JORNADA DOMINGO" (color/acento distinto) y nota indicando que la hora dominical se liquida con valor diferente.
   - Filas de lunes a sábado con etiqueta "Hs extra" como en v3.
3. **Resumen final separado por tipo de hora**:
   - Total horas extras día hábil (valor normal).
   - Total horas extras domingo (valor dominical) — separado para que RRHH liquide con el valor que corresponda.
   - Total horas trabajadas en domingo (informativo, base 4h).
4. **Encabezado** aclara los dos criterios:
   - "Días hábiles: extra = bruto − 8h"
   - "Domingo: jornada estándar 9–13 (4h), extra = bruto − 4h. Valor hora dominical diferente."

## Datos
Mismo dataset que v3 (`fichajes` desde 26/04 hasta fin de esta semana, join con `empleados` y `sucursales`, cálculo bruto salida−entrada). Solo cambia la lógica de cálculo de la columna "diferencia" y la presentación.

## Salida
- `/mnt/documents/reporte_horas_extras_v4.pdf` (deja v1, v2 y v3 intactos).
- QA visual con `pdftoppm` página por página antes de entregar.

## Detalle técnico
- Reutilizar `/tmp/horas_data3.txt` y adaptar `/tmp/gen_horas_v3.py` → `/tmp/gen_horas_v4.py`.
- En el loop por fila: `if dow == 0: base = 4 else: base = 8; extra = horas_brutas - base`.
- Solo incluir fila si `extra > 0` o si es domingo (todo trabajo dominical es relevante aunque no supere 4h, por el valor hora distinto).
- En el resumen por empleado: dos columnas separadas `total_extras_habil` y `total_extras_domingo` + `total_horas_domingo`.
