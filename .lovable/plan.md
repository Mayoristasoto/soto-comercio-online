## Carga Masiva de Horarios – Sábados y Domingos

### Ubicación
- **Nueva página**: `/rrhh/horarios-masivos` (registrada en `src/App.tsx` y entrada en sidebar para `admin_rrhh`).
- **Nueva pestaña** "Carga masiva" dentro de `src/pages/PlanificacionSemanal.tsx`, que reutiliza el mismo componente.

### Componente principal
`src/components/horarios/CargaMasivaHorarios.tsx` con un wizard de 3 pasos:

**Paso 1 – Configuración**
- Selector de **día**: Sábado / Domingo (multi-select, permite ambos).
- Selector de **alcance**:
  - Excepción puntual → pide fecha específica (escribe en `horarios_excepcionales`).
  - Turno habitual recurrente → escribe/actualiza `empleado_turnos` con `dia_semana`.
- Selector de **modo de carga**:
  1. **Manual masivo**: filtros (sucursal, rol, grupo, búsqueda) + tabla con checkboxes para seleccionar empleados, e inputs únicos de Entrada / Salida / Pausa que se aplican a todos los seleccionados.
  2. **Por grupos**: dropdown con `grupos_empleados`; trae los miembros automáticamente.
  3. **Importar Excel/CSV**: drop-zone que acepta columnas `DNI | Empleado | Día | Entrada | Salida | Pausa (min)`. Botón "Descargar plantilla".

**Paso 2 – Vista previa y validación**
Tabla con todas las filas a aplicar mostrando: Empleado, Sucursal, Día/Fecha, Entrada, Salida y columna **Estado** con badges:
- 🟢 OK – sin conflictos.
- 🟡 Conflicto turno – ya tiene turno cargado ese día (muestra el existente; permite "sobrescribir" / "omitir").
- 🔴 Vacaciones / Licencia – el empleado tiene vacaciones aprobadas o ausencia médica en esa fecha; bloqueado por defecto.
- ⚫ Error de importación – DNI no encontrado, formato HH:MM inválido, salida ≤ entrada, sucursal inexistente.

Contadores arriba: total / OK / conflictos / bloqueados. Botón **"Confirmar y guardar"** queda deshabilitado si hay filas en estado bloqueado sin resolver.

**Paso 3 – Resultado**
Resumen: insertados, actualizados, omitidos, con descarga CSV del log.

### Validaciones (RPC nueva)
`public.validar_horarios_masivos(payload jsonb) returns jsonb` (SECURITY DEFINER, solo `admin_rrhh`):
- Resuelve empleado por DNI o por id; verifica `activo = true`.
- Cruza contra `empleado_turnos` (mismo `dia_semana`, `activo = true`) → conflicto turno.
- Cruza contra `solicitudes_vacaciones` (estado aprobada/gozadas) y `ausencias_medicas` en la fecha → bloqueado.
- Verifica formato `HH:MM` y que `salida > entrada`.
- Devuelve el listado con `status` por fila.

### Guardado (RPC nueva)
`public.guardar_horarios_masivos(payload jsonb, sobrescribir boolean) returns jsonb`:
- Si **excepción puntual** → `INSERT` en `horarios_excepcionales` con la fecha.
- Si **turno habitual** → upsert en `empleado_turnos` por `(empleado_id, dia_semana)` respetando los índices únicos parciales existentes.
- Registra auditoría en `fichaje_auditoria` con motivo "carga_masiva_horarios".

### Validaciones de UI (zod)
Schema para el formulario manual y para cada fila del CSV: horas en formato `HH:MM`, pausa entre 0 y 180, día ∈ {sábado, domingo}.

### Detalles técnicos
- Parser de Excel con `xlsx` (ya en dependencias por `VacacionesImport`).
- Hook `useEmpleadosActivos` reutilizado para filtros.
- Sin cambios en lógica existente de turnos; solo se agregan las dos RPC nuevas y la UI.

### Archivos
**Nuevos**
- `src/pages/HorariosMasivos.tsx`
- `src/components/horarios/CargaMasivaHorarios.tsx`
- `src/components/horarios/PasoConfiguracion.tsx`
- `src/components/horarios/PasoVistaPrevia.tsx`
- `src/components/horarios/ImportadorCSV.tsx`
- Migración con las dos RPC.

**Modificados**
- `src/App.tsx` – ruta nueva.
- `src/pages/PlanificacionSemanal.tsx` – pestaña "Carga masiva".
- Sidebar (`app_pages`) – entrada de menú.
