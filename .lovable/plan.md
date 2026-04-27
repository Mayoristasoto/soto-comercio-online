# Plan: PDF de días sin fichaje – Abril 2026

## Objetivo
Generar un archivo PDF descargable con el listado de empleados y los días en que no registraron fichaje durante abril 2026 (1 al 27), excluyendo domingos. Solo se incluirán empleados con al menos un fichaje en el período.

## Pasos

1. **Consultar la base de datos** (`psql`)
   - Reutilizar la query ya validada (CTE de días laborables × empleados con fichajes, LEFT JOIN para detectar faltantes).
   - Agrupar por empleado: nombre, apellido, sucursal principal, cantidad de días faltantes y listado de fechas (formato `dd/mm`).
   - Ordenar por cantidad de faltas descendente.

2. **Generar el PDF** con Python + ReportLab
   - Salida: `/mnt/documents/dias_sin_fichaje_abril_2026.pdf`
   - Aplicar branding corporativo SOTO (Primary `#4b0d6d`, Secondary `#95198d`, Accent `#e04403`).
   - Estructura:
     - Encabezado con logo/título: "Reporte de Días sin Fichaje – Abril 2026"
     - Subtítulo con período (01/04 – 27/04), criterios (excluye domingos, base: empleados con ≥1 fichaje) y fecha de generación.
     - Tabla con columnas: **Empleado** | **Sucursal** | **Días faltantes (cantidad)** | **Fechas**.
     - Fila resaltada en color de alerta (`accent`) para empleados con ≥5 días faltantes.
     - Pie de página con total de empleados analizados y total de días faltantes.

3. **QA visual obligatorio**
   - Convertir el PDF a imagen con `pdftoppm` y revisar cada página.
   - Verificar: ausencia de texto cortado, columnas alineadas, fechas legibles (wrap correcto si hay muchas), colores consistentes.
   - Iterar hasta que la inspección no detecte problemas.

4. **Entrega**
   - Emitir tag `<lov-artifact>` apuntando al PDF generado para descarga directa.

## Detalles técnicos
- Script Python en `/tmp/generar_pdf_faltantes.py` que ejecuta la query vía `psql -t -A -F'|'` y arma la tabla con `Platypus` (`SimpleDocTemplate` + `Table` + `TableStyle`).
- Manejo de listas largas de fechas: usar `Paragraph` dentro de la celda para permitir wrap automático.
- Orientación: vertical A4; si la columna "Fechas" desborda, cambiar a horizontal en el ajuste de QA.

## Fuera de alcance
- No se cruzan vacaciones / licencias aprobadas (puede agregarse en una iteración posterior si se desea distinguir ausencias justificadas).
