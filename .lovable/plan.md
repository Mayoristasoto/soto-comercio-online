# Vista de día informativa y exportable en Fichero > Vista Calendario

## Objetivo
En la pestaña "Vista Calendario" (Sistema de Fichado > Horarios) poder seleccionar un día puntual, verlo en modo solo lectura (informativo) y descargarlo en Excel y PDF.

## Qué se agrega

1. **Barra de día en la vista calendario**
   - Selector de fecha (datepicker) además de las flechas Anterior / Hoy / Siguiente que ya existen.
   - Filtro por sucursal y por grupo de empleados (mismo selector compacto usado en el resto del módulo).

2. **Modo informativo (solo lectura)**
   - Switch "Solo lectura" activado por defecto en esta vista: se desactiva el arrastre de turnos y el guardado, así nadie modifica horarios sin querer al consultar.
   - El detalle del turno se puede seguir abriendo para ver información, pero sin botones de edición.

3. **Resumen del día** (encima de la grilla, solo informativo)
   - Cantidad de empleados con turno, total de horas programadas, pico de cobertura por hora y detección de solapamientos.

4. **Exportar el día**
   - Botón "Exportar día" con dos opciones:
     - **Excel**: hoja "Detalle" (Sucursal, Empleado, Turno, Entrada, Salida, Pausa, Horas) y hoja "Cobertura por hora" (empleados por franja horaria).
     - **PDF**: encabezado con fecha y filtros aplicados, tabla de empleados por sucursal y la línea de cobertura por hora. Con la paleta corporativa y la leyenda "Documento informativo — no modifica horarios".
   - Nombre de archivo: `horarios-dia-YYYY-MM-DD`.

## Detalles técnicos
- Se modifica `src/components/fichero/TimelineView.tsx` para aceptar props `readOnly` y `showExport`, agregar datepicker y barra de resumen; el drag&drop queda condicionado a `!readOnly`.
- En `src/components/fichero/FicheroHorarios.tsx`, el `TabsContent value="calendar"` renderiza `<TimelineView readOnly showExport />`.
- Nuevo util `src/utils/horariosDiaExport.ts` con `exportDiaXLSX()` (xlsx, ya instalado) y `exportDiaPDF()` (jsPDF + autotable, como el resto de reportes).
- Sin cambios de base de datos: se usan los datos que ya devuelve `useTimelineData` (empleados, turnos del día).
