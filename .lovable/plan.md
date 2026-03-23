

## Plan: Generar PDF de llegadas tarde de Matias Merino

### Situación
La función `generarReporteLlegadasTarde()` en `src/utils/reporteLlegadasTardePDF.ts` ya genera exactamente este PDF profesional con logo, resumen ejecutivo, tabla detallada, observaciones y sección de firmas. Solo necesita ser invocada con los parámetros correctos.

### Datos disponibles (ya consultados)
- **Empleado**: Matias Esteban Merino (ID: `9871bc34-120f-42a8-a214-5d34a516d7f6`)
- **Período**: 01/02/2026 al 23/03/2026
- **20 llegadas tarde**, 1.619 minutos acumulados (~27 hs), 0 justificadas
- **Nota**: Los registros del 16, 17 y 18/03 muestran retrasos de 240-367 min porque el cambio de turno a 14:30 recién se aplicó el 19/03

### Implementación

**Opción A — Desde la UI existente (sin cambios de código)**:
La función ya está disponible en el módulo de Incidencias del Fichero. Navegá a `/operaciones/fichero` → pestaña Incidencias → seleccioná a Merino → botón "Exportar PDF" con rango Feb 01 a Mar 23.

**Opción B — Agregar un botón rápido en el dashboard** (si no existe acceso directo):
Crear un script que llame directamente:
```typescript
await generarReporteLlegadasTarde(
  '9871bc34-120f-42a8-a214-5d34a516d7f6',
  '2026-02-01',
  '2026-03-23'
);
```
Esto descarga automáticamente el PDF `llegadas_tarde_Merino_Matias_2026-02-01_2026-03-23.pdf`.

### Recomendación
Usar **Opción A** — la funcionalidad ya existe. Si necesitás que agregue un botón de acceso rápido o que genere el PDF server-side como archivo descargable, confirmame y lo implemento.

