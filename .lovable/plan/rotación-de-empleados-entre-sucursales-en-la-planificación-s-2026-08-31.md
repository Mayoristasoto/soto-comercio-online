# Rotación de empleados entre sucursales en la planificación semanal

## Objetivo
Poder rotar/intercambiar empleados entre sucursales sobre una planificación semanal guardada como borrador (por ejemplo "Semana del 31/08"), ver el resultado, exportarlo en PDF y Excel y luego enviarlo a aprobación de RRHH.

## Caso concreto
En el borrador "Semana del 31/08" hoy están:
- Jonathan Jesus Vera → José Martí
- Carla Lorena Carrion → Juan B. Justo

Con la rotación, cada uno pasa a la sucursal del otro y **toma el horario del puesto** que ocupaba el otro (rotación de puesto), día por día, en todos los días de la semana en que ambos aparecen.

## Qué se agrega

1. **Botón "Rotar empleados" en la planificación semanal**
   - Se abre desde la barra de acciones de la semana (junto a Guardar / Copiar día / Exportar).
   - Diálogo con:
     - Empleado A (con su sucursal actual en la semana) y Empleado B.
     - Modo: **Intercambiar puesto** (cada uno toma el horario del otro) o **Solo cambiar de sucursal** (mantiene su horario).
     - Días alcanzados: toda la semana o selección de días.
     - Vista previa del antes/después por día antes de confirmar.
   - Los cambios se aplican al borrador de la semana en pantalla (no toca el legajo del empleado ni los turnos asignados). Se guardan al usar "Guardar planificación" como siempre.
   - Cada fila rotada queda marcada como provisoria/rotada para que se distinga en la vista y en los exportables.

2. **Abrir un borrador guardado y rotar sobre él**
   - Desde el listado de planificaciones guardadas ("Abrir"), se carga la semana al borrador de trabajo y ahí se puede aplicar la rotación.

3. **Exportar la semana rotada**
   - Los exportables existentes (PDF completo, PDF resumen y Excel) incluyen la columna/indicador de sucursal y una nota de las rotaciones aplicadas ("Vera ⇄ Carrion, 31/08 al 06/09").
   - Nombre de archivo: `planificacion-semana-YYYY-MM-DD`.

4. **Flujo de aprobación intacto**
   - Después de rotar y guardar, se usa "Enviar a validación de RRHH" y RRHH la aprueba desde su bandeja como cualquier otra semana.

## Entregable inmediato
Además de la funcionalidad, genero ya los archivos de la semana del 31/08 con la rotación Vera ⇄ Carrion aplicada:
- `planificacion_semana_31-08_rotacion_vera_carrion.pdf`
- `planificacion_semana_31-08_rotacion_vera_carrion.xlsx`

## Detalles técnicos
- Nuevo diálogo `src/components/fichero/RotarEmpleadosDialog.tsx`.
- En `VistaSemanaPlanificacion.tsx`: acción que, para cada día seleccionado, reescribe el borrador del día (`useDiaBorrador` → `escribirBorradorDia`) quitando las filas reales de los dos empleados y agregando tramos provisorios cruzados (sucursal y horario del otro según el modo elegido), respetando pausa y horas extras del puesto.
- `src/utils/horariosDiaExport.ts`: agregar la nota de rotaciones al encabezado del PDF y una columna "Rotado" en el Excel.
- Sin cambios de base de datos: la rotación vive en el borrador de la semana y se persiste en `planificacion_semanal_detalle` al guardar.
