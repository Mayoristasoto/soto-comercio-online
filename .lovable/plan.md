

## Plan: Generar PDF de llegadas tarde de Matias Merino

### Resumen
Crear una nueva utilidad PDF (`reporteLlegadasTardePDF.ts`) y un boton en la pagina de incidencias (o una pagina/componente dedicado) que genere un reporte imprimible con todas las llegadas tarde de un empleado especifico, incluyendo las aclaraciones y observaciones del mensaje anterior.

### Enfoque
Crear un archivo `src/utils/reporteLlegadasTardePDF.ts` que genere un PDF profesional con:

1. **Portada**: Logo SOTO, titulo "Reporte de Llegadas Tarde", nombre del empleado, periodo
2. **Resumen ejecutivo**: Total de llegadas tarde, promedio de retraso, dias con mayor retraso
3. **Tabla detallada**: Las 20 llegadas tarde con fecha, hora programada, hora real, minutos de retraso, justificacion
4. **Observaciones/Aclaraciones**: 
   - Patron de retrasos menores (1-7 min) vs criticos (30+ min)
   - Dias criticos destacados: 06/02 (266 min), 05/02 (155 min)
   - Total de llegadas sin justificar: 20/20
   - Nota sobre frecuencia constante del patron
5. **Pie de pagina**: Fecha de generacion, firma del gerente, firma del empleado (espacios en blanco para firmar)

### Archivos a crear
- `src/utils/reporteLlegadasTardePDF.ts` - Generador del PDF

### Archivos a modificar
- `src/pages/ListadoIncidencias.tsx` - Agregar boton para generar el PDF filtrado por empleado

### Detalle tecnico

**Datos a consultar via Supabase:**
```text
fichajes_tardios -> filtrar por empleado_id de Matias Merino
Campos: fecha, hora_programada, hora_real, minutos_retraso, justificado
```

**Estructura del PDF:**
```text
Pagina 1: Portada + Resumen
  - SOTO mayorista
  - "Reporte de Llegadas Tarde"
  - Empleado: Matias Esteban Merino
  - Periodo: 14/01/2026 - 24/02/2026
  - Resumen: 20 llegadas, 0 justificadas, promedio ~27 min

Pagina 2+: Tabla detallada
  # | Fecha | Hora Programada | Hora Real | Retraso | Justificado
  1 | 24/02 | 10:30           | 11:09     | 39 min  | No
  ...

Pagina final: Observaciones + Firmas
  - Aclaraciones del reporte
  - Espacio firma gerente
  - Espacio firma empleado
  - "Acuse de recibo" para que el empleado firme
```

**Generacion:** Se invocara directamente consultando fichajes_tardios y generando el PDF con jsPDF + autoTable, reutilizando PDF_STYLES y COMPANY_INFO existentes.

