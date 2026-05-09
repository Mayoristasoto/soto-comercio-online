# Plan: Recalcular horas extras en bruto (sin descontar pausas)

## Cambio
- En el script `/tmp/gen_horas.py`, calcular `horas_trabajadas = salida − entrada` (sin restar pausas).
- `diferencia = horas_trabajadas − 8`.
- Aplicar el nuevo criterio a las 3 secciones (A: >8h, B: domingo, C: resumen).
- Actualizar la nota de cabecera: "Horas calculadas como salida − entrada (presencia bruta, sin descontar pausas)".

## Validación de referencia
- Lan, Laura Lorena – 04/05: 07:27 → 18:29 = **11h 02m** trabajadas, **+3h 02m** extras.

## Salida
- Sobrescribir `/mnt/documents/reporte_horas_extras_v2.pdf` (nuevo archivo, deja el v1 intacto).
- QA visual con `pdftoppm` página por página antes de entregar.
