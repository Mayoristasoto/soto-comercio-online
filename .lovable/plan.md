

## Plan: PDF profesional de horas trabajadas de Agustina Galaz

### Qué se genera
Un PDF profesional con branding SOTO (púrpura/magenta/naranja) que incluye:

1. **Portada con resumen ejecutivo**: Nombre, período (Feb-Mar 2026), jornada asignada (6hs), totales y promedios
2. **Tabla detallada por día**: Fecha, entrada, salida, minutos trabajados, diferencia vs 360 min, con colores para excesos/déficits
3. **Resumen final**: Balance global (-405 min), días sin salida registrada, observaciones

### Datos
- **Empleada**: Agustina Lucia Galaz (ID: `56cf495f-41ca-4615-8a57-05d62c429c9c`)
- **Período**: 04/02/2026 – 25/03/2026
- **Jornada estándar**: 6 horas (360 min)
- **Fuente**: Query directo a `fichajes` con timezone `America/Argentina/Buenos_Aires`

### Implementación
Script Python con ReportLab que:
1. Consulta `fichajes` vía `psql` y exporta a CSV temporal
2. Procesa los datos calculando minutos trabajados y diferencia vs 360
3. Genera PDF con estilos de `PDF_STYLES` (colores SOTO: primary `#4b0d6d`, secondary `#95198d`, accent `#e04403`)
4. QA visual obligatorio convirtiendo a imagen e inspeccionando

### Archivo de salida
`/mnt/documents/horas_trabajadas_Galaz_Agustina_Feb-Mar_2026.pdf`

### Archivos consultados (sin modificar)
| Archivo | Uso |
|---------|-----|
| `src/utils/pdfStyles.ts` | Colores y tipografías corporativas SOTO |

