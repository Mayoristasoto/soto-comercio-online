# Plan: Reporte PDF de Horas Extras (esta semana + semana pasada)

## Objetivo
Generar un PDF descargable para gestionar horas extras, identificando:
1. Empleados que trabajaron **más de 8 horas** en algún día.
2. Empleados que trabajaron **en domingo** y cuántas horas.
3. Listado **ordenado por día**, mostrando la **diferencia de horas** (horas trabajadas − 8) por empleado/día.

**Período**: semana actual + semana pasada (lunes a domingo, hora Argentina UTC-3).

## Pasos

1. **Consulta SQL** (`psql`)
   - Calcular el rango: lunes de la semana pasada → domingo de esta semana (zona Argentina).
   - Por cada `empleado` y `fecha`, obtener `entrada` mínima y `salida` máxima de `fichajes`, descontar pausas (`pausa_inicio`/`pausa_fin`).
   - Calcular `horas_trabajadas` y `diferencia = horas_trabajadas - 8`.
   - Marcar si la fecha es domingo (`EXTRACT(DOW) = 0`).

2. **Filtrado de datos para el reporte**
   - Sección A — **Horas extras (> 8 h)**: filas con `horas_trabajadas > 8`, ordenadas por **fecha ascendente** y dentro del día por diferencia descendente.
   - Sección B — **Trabajo en domingo**: todas las filas en domingo (cualquier cantidad de horas), ordenadas por fecha y empleado.
   - Sección C — **Resumen por empleado**: total de horas extras acumuladas y total de horas en domingo en el período.

3. **PDF con Python + ReportLab** → `/mnt/documents/reporte_horas_extras.pdf`
   - Branding SOTO (Primary `#4b0d6d`, Secondary `#95198d`, Accent `#e04403`).
   - Encabezado: "Reporte de Horas Extras y Trabajo en Domingo" + período + fecha de generación.
   - Tabla A: **Fecha | Día | Empleado | Sucursal | Entrada | Salida | Horas trabajadas | Diferencia (+h)** — diferencia resaltada en accent.
   - Tabla B: **Fecha | Empleado | Sucursal | Horas en domingo** — fondo suave para destacar.
   - Tabla C (resumen): **Empleado | Total horas extras | Total horas domingo**.
   - Orientación horizontal (A4 landscape) por la cantidad de columnas.

4. **QA visual obligatorio**
   - `pdftoppm` → revisar cada página: sin texto cortado, columnas alineadas, totales correctos.
   - Iterar hasta quedar limpio.

5. **Entrega**
   - Emitir `<lov-artifact>` apuntando al PDF.

## Detalles técnicos
- Pausas: sumar `(pausa_fin - pausa_inicio)` por día y restar al `(salida - entrada)`.
- Empleados base: solo los que tienen al menos un fichaje en el período.
- Si un día tiene `entrada` sin `salida`, se omite del cálculo de horas extras (se podría listar aparte si se requiere — fuera de alcance por defecto).
- Zona horaria: convertir `timestamp_real` a `America/Argentina/Buenos_Aires` antes de extraer fecha y día de semana.

## Fuera de alcance
- Cruzar con turnos programados o feriados (puede agregarse luego).
- Distinguir horas extras al 50% vs 100% según legislación.
