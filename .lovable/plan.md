# Varias versiones de la planilla del Estudio y archivo de lo enviado

## Objetivo
Trabajar la planilla del Estudio Contable completa desde la web, con varios borradores por mes. Además, tener guardadas en el sistema todas las planillas que ya se mandaron al estudio, como respaldo.

## Qué se agrega

1. **Varios borradores por mes**
   - En lugar de un único borrador por mes, cada mes puede tener varias versiones con nombre (por ejemplo "Borrador 1", "Con ajustes de Laura", "Versión final").
   - Al abrir el editor aparece la lista de versiones del mes, con nombre, quién la editó por última vez, la fecha y el estado.
   - Acciones: **Nuevo borrador** (en blanco con los datos del sistema, o copia de otra versión), **Renombrar**, **Duplicar** y **Borrar**.
   - El borrador que ya existe hoy pasa a ser "Borrador 1" de su mes, sin perder nada.

2. **Marcar como enviada al estudio**
   - Botón "Marcar como enviada". La versión queda congelada, en solo lectura, con la fecha de envío y quién la mandó.
   - Al marcarla se guarda una copia del Excel descargado, para que quede exactamente lo que se mandó.

3. **Archivo de planillas enviadas** (nueva pestaña "Historial Estudio" en Novedades para Liquidación)
   - Lista de todas las planillas enviadas, por mes y año, con búsqueda.
   - Por cada una: abrirla en la Vista Excel (solo lectura), descargar el archivo original o duplicarla como borrador nuevo.

4. **Subir planillas anteriores**
   - Botón "Subir planilla enviada". Elegís el archivo de Excel que ya mandaste y el mes al que corresponde (el sistema lo sugiere a partir del título "Novedades SOTO MES AÑO").
   - El sistema guarda el archivo original y además lee la tabla (empleados, columnas y anotaciones generales) para poder verla en la Vista Excel.
   - Si alguna fila no se puede leer bien, igual queda guardado el archivo original como respaldo.
   - Se pueden subir varias planillas de una vez.

## Detalles técnicos
- La tabla `novedades_estudio_borradores` suma estas columnas: `nombre`, `origen` ('sistema' | 'importada'), `enviada_at`, `enviada_por` y `archivo_path`. También se quita la restricción de un solo registro por `periodo`. El estado puede ser `borrador`, `cerrado` o `enviada`. El registro actual se renombra a "Borrador 1". Se mantiene RLS solo para admin_rrhh.
- Bucket privado nuevo `estudio-contable` con políticas solo para admin_rrhh. Los archivos se guardan en `{periodo}/{id}.xlsx`.
- `EditorEstudioContable` recibe `borradorId` y deja de buscar por período. Nuevo `SelectorVersionesEstudio` para listar, crear, duplicar, renombrar y borrar versiones.
- Lectura de los archivos con `exceljs`: se ubica la fila de encabezados ("Legajo", "Apellido y Nombre"…), se leen las filas hasta "ANOTACIONES GENERALES" y luego las anotaciones. Las versiones importadas guardan sus filas en `filas_manuales`, sin cruzarlas con los datos del sistema.
- "Marcar como enviada" genera el Excel con `exportarEstudioDesdeFilas` y lo sube al bucket antes de cambiar el estado.
- Nueva pestaña `HistorialEstudio.tsx` en `NovedadesLiquidacion.tsx`.
