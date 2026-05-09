## Objetivo
Generar `reporte_horas_extras_v3.pdf` que unifique en un solo documento:
- Horas extras (>8h brutas) de esta semana y la semana pasada (criterio bruto, ya validado en v2).
- Trabajo en domingos, **incluyendo el domingo 26/04** (que faltaba en v2).

## Cambios respecto a v2
1. **Ampliar el rango de domingos**: actualmente v2 solo incluye los domingos dentro del rango "esta semana + semana pasada". Extender la consulta de domingos hacia atrás para incluir explícitamente **26/04** (además de los domingos ya listados).
2. **Unificación**: mantener una sola tabla por día ordenada cronológicamente, marcando con una etiqueta "DOMINGO" las filas correspondientes, en lugar de tener secciones separadas. Cada fila muestra: fecha, día, empleado, sucursal, entrada, salida, horas brutas, diferencia vs 8h.
3. **Resumen final**: total de horas extras por empleado + total de horas trabajadas en domingo por empleado.

## Datos a consultar (Supabase)
- `fichajes` filtrando por fecha entre 26/04 y fin de esta semana, con entrada y salida.
- Join con `empleados` (nombre, apellido) y `sucursales` (nombre).
- Cálculo: `horas_brutas = (salida − entrada)` en horas; `diferencia = horas_brutas − 8`.

## Salida
- `/mnt/documents/reporte_horas_extras_v3.pdf` (deja v1 y v2 intactos).
- Encabezado aclara: "Cálculo bruto (salida − entrada), sin descontar pausas".
- QA visual con `pdftoppm` página por página antes de entregar.
