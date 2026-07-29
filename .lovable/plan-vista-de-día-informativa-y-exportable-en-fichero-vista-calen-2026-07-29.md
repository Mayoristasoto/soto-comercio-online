# Vista de día informativa y exportable en Fichero > Vista Calendario

## Objetivo
En la pestaña "Vista Calendario" (Sistema de Fichado > Horarios) poder seleccionar un día puntual, verlo en modo solo lectura (informativo) y descargarlo en Excel y PDF.

## Qué se agrega

1. **Barra de día en la vista calendario**
   - Selector de fecha (datepicker) además de las flechas Anterior / Hoy / Siguiente que ya existen.
   - Filtro por sucursal y por grupo de empleados (mismo selector compacto usado en el resto del módulo).

2. **Modo borrador del día (no afecta los horarios reales)**
   - La vista arranca con los turnos reales del día como punto de partida, pero todo lo que se toque queda en un "borrador del día" que nunca se guarda en la base de horarios.
   - Se puede:
     - **Agregar empleados** al día (buscador de empleados activos, incluso los que ese día no tienen turno).
     - **Editar hora de entrada/salida y pausa** de cualquier fila, solo para ese día.
     - **Quitar** un empleado del borrador.
     - Arrastrar el bloque en la grilla para reubicar el horario (solo en el borrador).
   - Cada fila modificada o agregada se marca visualmente como "provisorio".
   - Botones "Restablecer al horario real" y aviso permanente: "Simulación informativa — no modifica los horarios asignados".
   - El borrador se guarda en el navegador (localStorage) por fecha, para no perderlo al cambiar de pestaña.

3. **Resumen del día** (encima de la grilla, se recalcula con el borrador)
   - Cantidad de empleados con turno, total de horas programadas, cobertura por hora y detección de solapamientos/huecos.

4. **Exportar el día**
   - Botón "Exportar día" con dos opciones:
     - **Excel**: hoja "Detalle" (Sucursal, Empleado, Turno, Entrada, Salida, Pausa, Horas, Origen: real / provisorio) y hoja "Cobertura por hora".
     - **PDF**: encabezado con fecha y filtros, tabla de empleados por sucursal marcando los provisorios y la línea de cobertura por hora. Paleta corporativa y leyenda "Documento informativo — no modifica horarios".
   - Nombre de archivo: `horarios-dia-YYYY-MM-DD`.

## Detalles técnicos
- Se modifica `src/components/fichero/TimelineView.tsx` para aceptar props `modoBorrador` y `showExport`: los cambios van a un estado local (`draftShifts`) en vez de llamar a `updateShift` contra la base.
- Nuevo hook `src/hooks/useDiaBorrador.ts`: mantiene el borrador por fecha (agregar/editar/quitar/reset) y lo persiste en localStorage.
- Nuevo diálogo "Agregar empleado al día" con búsqueda sobre `empleados` activos + campos de entrada/salida/pausa.
- En `src/components/fichero/FicheroHorarios.tsx`, el `TabsContent value="calendar"` renderiza `<TimelineView modoBorrador showExport />`.
- Nuevo util `src/utils/horariosDiaExport.ts` con `exportDiaXLSX()` (xlsx, ya instalado) y `exportDiaPDF()` (jsPDF + autotable, como el resto de reportes).
- Sin cambios de base de datos ni escrituras en `empleado_turnos`.
