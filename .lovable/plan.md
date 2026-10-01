# Editar el Excel del Estudio Contable desde la web (borrador)

## Objetivo
En Novedades para Liquidación, ver y editar la planilla "Novedades SOTO" en pantalla antes de descargarla. Se pueden corregir valores y cargar novedades a mano, y todo queda guardado como borrador del mes.

## Qué se agrega
1. **Botón "Editar planilla Estudio"** junto al export actual. Abre una grilla con las mismas columnas del Excel: Legajo, Apellido y Nombre, Obra social, Feriados, Día gremio, Lic. enfermedad, Lic. enf. familiar, Inasistencias, Días vacaciones, Fechas vac., Observaciones.
2. **Datos que llegan solos**: la grilla se completa con lo que calcula el sistema, igual que hoy.
3. **Edición manual**: cualquier celda se puede editar. Las celdas cambiadas a mano se marcan de otro color y tienen un botón "volver al valor del sistema".
4. **Anotaciones generales**: las que arma el sistema, más un campo para agregar, editar o borrar líneas a mano.
5. **Agregar fila manual** para alguien que no figura en el sistema y **ocultar filas** de la exportación.
6. **Borrador por mes**: se guarda solo (con aviso "Guardado") y queda a nombre de quien lo editó, con la fecha. Lo puede retomar cualquier usuario de RRHH. Estados: **Borrador** y **Cerrado**. Cerrado queda en solo lectura y RRHH lo puede reabrir.
7. **Descargar Excel** con los valores del borrador: el mismo formato y los mismos colores de hoy, y las celdas manuales marcadas.
8. Botón **"Recalcular desde el sistema"**: actualiza los valores automáticos y mantiene lo que se editó a mano.

## Detalles técnicos
- Tabla nueva `novedades_estudio_borradores`: periodo (mes, único), estado, `overrides` jsonb (`{empleado_id: {columna: valor}}`), `filas_manuales` jsonb, `ocultos` jsonb, `anotaciones` jsonb, `updated_by`, `updated_at`. Incluye GRANT a authenticated y service_role, y RLS solo para admin_rrhh.
- `novedadesEstudioXLSX.ts` se divide en `construirFilasEstudio()` (cálculo puro) y `exportar(filas, anotaciones)`, que usan la grilla y la descarga.
- Componente nuevo `EditorEstudioContable.tsx`: grilla editable con inputs y guardado automático con espera de unos segundos.
- Se integra en `NovedadesLiquidacion.tsx` y reutiliza los datos que la página ya carga.
