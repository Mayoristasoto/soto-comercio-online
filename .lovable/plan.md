# Exportar "Novedades SOTO" con el formato del estudio contable

Objetivo: que desde Novedades para Liquidación se descargue un Excel idéntico a `Prueba_Lovable.xlsx` (hoja con el nombre del mes, título, tabla de empleados y bloque "ANOTACIONES GENERALES"), completado automáticamente con los datos del sistema.

## Mapeo de cada columna

| Col | Encabezado | Origen en el sistema | Estado |
|---|---|---|---|
| A | Legajo | `empleados.legajo` | OK |
| B | Apellido y Nombre | `empleados.apellido` + `nombre` (en mayúsculas) | OK |
| C | OBRA SOCIAL | no existe en la base | **falta crear campo** |
| D | Feriados | feriados trabajados del período (`get_feriados_trabajados`) | OK |
| E | Día Gremio | no existe categoría | **falta crear categoría** |
| F | Lic Enfermedad | días con justificación "Enfermedad" / "Licencia médica" / "Día médico" + `ausencias_medicas` | OK |
| G | Lic. Enf. Familiar | días con justificación "Enfermedad familiar" | OK |
| H | Inasistencias | días `NO_FICHADA` sin justificar (+ categorías no justificadas: "Sin justificar", "Ausente") | OK |
| I | Ds Vacaciones | días de vacaciones dentro del mes (`solicitudes_vacaciones`) | OK |
| J | Fechas Vac | rangos "dd/MM al dd/MM" de esas vacaciones | OK |
| K | Observaciones | `RECIBO POR {horas_jornada_estandar}HS` + adelanto del mes si existe | OK |

## Variables que marcaste

- `{$montoAdelanto}` → monto del adelanto aprobado del mes (`solicitudes_generales`, tipo `adelanto_sueldo`). Se agrega a Observaciones como `ADELANTO $X`.
- `{$empleado}` → apellido y nombre.
- `{$fechaVacaciones}` → rango de fechas de vacaciones del empleado en el mes.
- `{$diasEnfermedad}` → total columna F.
- `{$diasSinJustificar}` → total columna H (inasistencias).

El bloque ANOTACIONES GENERALES se genera automáticamente, una línea numerada por novedad relevante:
- `APELLIDO NOMBRE VACACIONES DEL dd/MM AL dd/MM`
- `APELLIDO NOMBRE X DIAS ENFERMEDAD`
- `APELLIDO NOMBRE X Inasistencias`

## Dos datos que hoy no existen y hay que agregar

1. **Obra social**: campo nuevo en el perfil del empleado (sección Nómina), con texto libre y opción de "desde MM-AAAA" como en tu planilla (`SANCOR / Desde 09-2025`).
2. **Día Gremio**: nueva categoría de justificación de asistencia, para que cuando se cargue ese día se cuente en la columna E.

## Diferencias de legajo detectadas (a corregir en el sistema)

- Galaz Agustina: sistema 36 / planilla 6
- Justiniano Gonzalo: sistema 36 (duplicado) / planilla 37
- Voikli Andrés: sistema 52 / planilla 38
- Sanchez Gudelevich Uriel: sin legajo / planilla 39
- Merino Matías (26) y Tedesco están inactivos pero figuran en la planilla

Como el estudio identifica por legajo, conviene alinearlos. Puedo hacerlo en la misma tanda si confirmás.

## Detalle técnico

- Nuevo util `src/utils/novedadesEstudioXLSX.ts` con `exceljs`/`xlsx` replicando la plantilla: título `Novedades SOTO {MES} {AÑO}`, encabezados en fila 3, datos desde fila 4, bloque de anotaciones debajo, fuente Arial, celdas vacías en lugar de ceros.
- Botón nuevo "Excel Estudio Contable" en `NovedadesLiquidacion.tsx`, junto a los exports actuales, usando el período ya seleccionado (mensual).
- Reutiliza `get_novedades_liquidacion`, `get_feriados_trabajados`, vacaciones, horas extras y adelantos que la página ya trae; no se duplican consultas.
- Migración: `empleados.obra_social` (text) y `empleados.obra_social_desde` (date, opcional) + alta de la categoría "Día gremio" en `categorias_justificacion_asistencia`, con sus GRANT/RLS existentes intactos.
- `EmployeeProfile.tsx`: dos campos nuevos en la sección Nómina.
