

## Problema

El boton "Generar Reporte PDF" fue agregado en la pagina `ListadoIncidencias.tsx` (ruta `/operaciones/listado-incidencias`), pero vos estas en la ruta `/operaciones/fichero#incidencias` que usa el componente `FicheroIncidencias.tsx` - son dos pantallas distintas.

## Solucion

Agregar el selector de empleado y el boton "Generar Reporte PDF" directamente en el componente `FicheroIncidencias.tsx`, que es donde estas viendo las incidencias.

### Cambios

**Archivo a modificar:** `src/components/fichero/FicheroIncidencias.tsx`

1. Importar `generarReporteLlegadasTarde` desde `@/utils/reporteLlegadasTardePDF` y el icono `Printer` de lucide-react
2. Agregar estados para `empleadoReporte`, `generandoReporte`, `fechaDesde` y `fechaHasta`
3. Cargar lista de empleados unicos desde los fichajes tardios mostrados
4. Agregar una seccion debajo de los filtros existentes con:
   - Un `Select` para elegir el empleado
   - Inputs de fecha desde/hasta
   - Un boton "Generar Reporte PDF" que invoque `generarReporteLlegadasTarde`

El boton quedara visible en la misma pantalla donde ves las incidencias, sin necesidad de navegar a otra pagina.

