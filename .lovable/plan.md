# Plan: Selección múltiple y asignación en lote en el Informe de Asistencia

## Objetivo
Permitir marcar varios eventos (llegadas tarde / ausencias) y aplicarles la **misma categoría** (Vacaciones, Licencia médica, etc.) + observación opcional en un solo click. Útil cuando un empleado tuvo muchos días seguidos del mismo motivo.

## Cambios en `InformeAsistenciaGerencial.tsx`

### 1. Estado de selección
- Nuevo `useState<Set<string>>` con los `evento_id` marcados.
- Limpiar selección automáticamente cuando se recargan eventos o cambian los filtros visibles (los seleccionados que ya no se ven se descartan).

### 2. Checkbox en la tabla
- Nueva primera columna `<TableHead>` con un checkbox "maestro" en el header (selecciona/deselecciona todos los visibles).
- Checkbox por fila vinculado al `Set`.

### 3. Barra de acción en lote (aparece cuando hay >=1 seleccionado)
Aparece justo arriba de la tabla, sticky:

```text
[N seleccionados]  Categoría: [Select ▼]  Observación: [Input]  [Aplicar a N]  [Limpiar selección]
```

- Select con categorías activas + opción "— Quitar categoría —".
- Input opcional de observación común.
- Botón "Aplicar a N" → ejecuta upsert en lote.

### 4. Lógica de aplicación masiva
- Nueva función `aplicarMasivo(categoriaId, observacion)`:
  - Si `categoriaId` es null → `DELETE` de `justificaciones_asistencia` donde `(tipo_evento, empleado_id, fecha_evento)` matchee con cada seleccionado que tenga `justificacion_id`.
  - Si hay categoría → un único `upsert` con array de filas usando `onConflict: "tipo_evento,empleado_id,fecha_evento"`.
- Actualizar el estado local de `eventos` sin recargar.
- Toast con resultado: "N eventos actualizados".

### 5. Atajos útiles
- "Seleccionar todos los visibles" / "Limpiar" en el header de la card (al lado del contador "Eventos: X / Y").
- Tecla `Esc` limpia selección.

## Fuera de alcance (lo dejamos para después si querés)
- Selección con `Shift+click` (rango).
- Aplicar masivo desde otras pantallas (Novedades, etc.).
- Crear vacaciones/licencias "reales" en `vacaciones_solicitudes` / `ausencias_medicas` desde acá — por ahora solo se justifica el evento con la categoría correspondiente (que es lo que el informe usa).

## Detalles técnicos
- El upsert masivo respeta el constraint actual `(tipo_evento, empleado_id, fecha_evento)`.
- `creado_por` se setea con el user actual en cada fila del array.
- Si alguno de los eventos seleccionados ya tenía categoría, se sobreescribe.
