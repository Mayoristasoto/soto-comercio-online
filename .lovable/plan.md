## Reporte de Novedades para Liquidación de Sueldos

Página nueva (`/rrhh/novedades-liquidacion`) que cruza turnos, fichajes, feriados, vacaciones aprobadas y licencias para entregar al departamento de liquidación un detalle día por día y empleado por empleado, listo para exportar (Excel + PDF).

### Lo que ve el usuario

Filtros arriba:
- Rango de fechas (default: mes en curso, 1–último día)
- Sucursal (multi-select)
- Empleado (multi-select, opcional)
- Incluir: solo con novedades / todos

Vista principal — tabla resumen por empleado:
```
Empleado | Días esperados | Trabajados | Feriados | Vacaciones | Lic. médica | Otras licencias | NO FICHADAS | Horas extra | Tardanzas
```

Click en una fila → detalle día por día con estado de cada jornada y, en cada "NO FICHADA", un botón **Justificar** que abre un diálogo para registrar la causa.

Estados por día:
- `TRABAJADO` (con fichaje válido de entrada)
- `FERIADO` (con o sin trabajo)
- `VACACIONES` (de `solicitudes_vacaciones` aprobada/gozadas)
- `LIC_MEDICA` (de `ausencias_médicas`)
- `DIA_MEDICO` / `PERMISO` (de `solicitudes_generales` aprobadas)
- **Nuevas licencias LCT**: `MATRIMONIO`, `FALLECIMIENTO_FAMILIAR`, `NACIMIENTO_HIJO`, `EXAMEN_ESTUDIANTIL`, `MATERNIDAD`, `PATERNIDAD`, `DONACION_SANGRE`, `ACTIVIDAD_GREMIAL`
- `NO_FICHADA` (día laborable sin fichaje y sin justificación) — esta es la fila a revisar
- `NO_LABORABLE` (no estaba en `dias_semana` del turno)

### Justificación en línea

En cada "NO FICHADA" un botón abre un dialog con:
- Tipo de justificación (dropdown con todas las licencias listadas arriba)
- Observación libre
- Opción "Adjuntar certificado" (storage existente)

Al confirmar, se inserta en `solicitudes_generales` con `estado='aprobada'` (auto-aprobado por ser el liquidador), o en `ausencias_medicas` si es licencia médica. El día queda re-marcado y desaparece de "NO FICHADAS".

### Exportación

- **Excel**: una hoja "Resumen" + hoja "Detalle día por día" + hoja "Vacaciones del período" (para que el liquidador vea los días a abonar y descontar del banco de vacaciones).
- **PDF**: formato corporativo (#4b0d6d / #95198d / #e04403), header con período, totales por empleado, lista de no-fichadas pendientes en rojo.

### Cambios técnicos

```text
DB (migration)
├─ Ampliar CHECK de solicitudes_generales.tipo_solicitud
│  + matrimonio, fallecimiento, nacimiento, examen, maternidad,
│    paternidad, donacion_sangre, gremial, licencia_medica
├─ Seed solicitudes_configuracion para los nuevos tipos
└─ RPC get_novedades_liquidacion(p_desde date, p_hasta date, p_sucursales uuid[])
   → devuelve filas (empleado_id, fecha, estado, detalle, horas_esperadas, horas_trabajadas)
   Implementa el algoritmo: turno activo → dias_semana → horarios_por_dia →
   resta feriados (con feriado_empleados_asignados) → vacaciones → ausencias →
   solicitudes → fichajes válidos.

Frontend
├─ src/pages/NovedadesLiquidacion.tsx           (página + filtros + tabla resumen)
├─ src/components/novedades/DetalleEmpleadoDialog.tsx
├─ src/components/novedades/JustificarAusenciaDialog.tsx
├─ src/utils/novedadesLiquidacionPDF.ts        (reutiliza pdfStyles + corporate palette)
├─ src/utils/novedadesLiquidacionXLSX.ts       (3 hojas)
└─ Ruta en App.tsx + link en AppSidebar (sección RRHH / Liquidación)

Reutilizables ya existentes
├─ ExportButton (Excel/CSV)
├─ pdfStyles + paleta corporativa
├─ obtenerConfigDiaEspecial / debeOmitirControles (feriados)
└─ patrón de filtros de ExportarHorarios
```

### Reglas clave (basadas en lo que ya existe)

- **Feriados**: si `dias_feriados.activo = true` y existe registro en `feriado_empleados_asignados` para el empleado/sucursal, cuenta como feriado. Si no hay asignación específica, se trata como feriado universal (configurable en filtro: "feriados universales sí/no", default sí).
- **Vacaciones**: `estado IN ('aprobada','gozadas')`, rango inclusivo.
- **Domingos rotativos** (regla del proyecto): no se marcan como NO_FICHADA si no están en `dias_semana` del turno base (caso Jonathan).
- **Tolerancia 1 min** y **pausa estándar 40 min** ya configuradas se respetan para "trabajado".

### Pendientes de tu decisión (los resuelvo si decís "dale")

1. **Licencias LCT** — incluyo las 9 más usadas listadas arriba; agrego/quito alguna si querés.
2. **Feriados sin asignación** — los trato como universales por default.
3. **Auto-aprobación al justificar desde el reporte** — sí (es el flujo del liquidador), queda auditado con `aprobado_por = auth.uid()`.
4. **Tabla `solicitudes` legacy** — la ignoro; uso `solicitudes_generales` como fuente única.

Decime si avanzo con esto o ajustamos algo antes.