# Recorrido de Salón + Checklist de Control: historial unificado

Las dos pantallas siguen existiendo por separado (el checklist con sus 37 puntos y el recorrido sobre el plano), pero comparten el mismo historial y las mismas fotos por punto del salón. Así, si en Pasillo 1 / Góndola 3 detectás faltante de productos, lo marcás en el plano y después ves toda la historia de ese punto: fechas, estados, observaciones y fotos, sin importar desde qué pantalla se cargó.

## Qué vas a poder hacer

1. **Marcar el punto exacto**: elegís el pasillo (zona) y dentro de él la góndola específica. El plano ya trae las góndolas del layout; se pueden generar automáticamente como puntos seleccionables.
2. **Evaluar en el momento**: sobre la góndola elegida marcás Cumple / Parcial / No cumple para cada criterio (Limpieza, Precios, Productos mal rotados, Faltantes), con observación y fotos.
3. **Ver historial del punto**: en cada góndola o pasillo, un botón "Historial" muestra todas las veces que se controló ese lugar, con fotos anteriores para comparar.
4. **Panel de hallazgos abiertos**: lista de todos los "No cumple" y "Parcial" de la sucursal, con foto, fecha y quién lo detectó.
5. **Asignar tarea después**: desde ese panel, Admin RRHH elige un hallazgo y crea una tarea para el encargado de la sucursal (queda vinculada al hallazgo, y cuando la tarea se completa el hallazgo pasa a "resuelto"). Los encargados no asignan tareas, solo registran hallazgos.
6. **Desde el checklist también**: en cada punto del checklist, un enlace opcional para indicar en qué zona/góndola se detectó, de modo que el hallazgo aparezca en el mismo historial del plano.

## Flujo en la sucursal

```text
Llego a la sucursal
  -> Nuevo recorrido (sucursal, responsable)
  -> Toco Pasillo 1 en el plano
      -> Toco Góndola 3
          -> Faltantes: No cumple + foto + nota
          -> (opcional) veo historial de esa góndola
  -> Sigo pasillo por pasillo
  -> Cierro recorrido
Admin RRHH
  -> Panel "Hallazgos abiertos"
  -> Asigna tarea al encargado
  -> Tarea completada -> hallazgo resuelto
```

## Detalles técnicos

Base de datos (nuevo, sin tocar góndolas ni el checklist existente):
- `recorrido_puntos`: puntos controlables dentro de una zona (id, `zona_id`, nombre, `gondola_ref` texto del layout v2, x/y/width/height en %, orden). Botón para generarlos desde `gondolas_v2` recortando por zona.
- `recorrido_hallazgos`: agregar `punto_id`, `punto_nombre`, `sucursal_id` (desnormalizado para historial rápido), `estado_seguimiento` (`abierto` | `en_tarea` | `resuelto`), `tarea_id` (FK a `tareas`), `resuelto_at`.
- `checklist_control_items`: agregar `zona_id` y `punto_id` opcionales para vincular un punto del checklist al plano.
- Vista `historial_hallazgos_punto`: unifica hallazgos del recorrido e ítems del checklist vinculados a un punto, con sucursal, fecha, estado, observaciones y conteo de fotos.
- Grants + RLS: lectura/escritura para `authenticated`; `admin_rrhh` ve todo, `gerente_sucursal` solo su sucursal (usando las funciones existentes `has_role` / `is_gerente_de_sucursal`). Sin cambios en tablas de góndolas.

Frontend:
- `recorridoTypes.ts`: tipos `RecorridoPunto` y campos de seguimiento.
- `PlanoCanvas.tsx`: segundo nivel de selección (zona -> puntos), coloreado por peor estado del punto.
- Nuevo `PuntosEditor.tsx`: generar puntos desde el layout v2, renombrar y borrar.
- Nuevo `HistorialPunto.tsx`: timeline del punto con fotos (reutiliza `FotoLightbox` y las fotos de `checklist-evidencias`).
- Nuevo `HallazgosAbiertos.tsx`: panel con filtros por sucursal/criterio/estado y acción "Asignar tarea" (solo `admin_rrhh`), que inserta en `tareas` con `sucursal_id`, `asignado_a` y `fecha_limite`.
- `RecorridoDetalle.tsx`: flujo zona -> punto -> criterios, con acceso al historial del punto.
- `RecorridoSalon.tsx`: nueva pestaña "Hallazgos" y editor de puntos junto al de zonas.
- `ChecklistItemRow.tsx`: selector opcional de zona/góndola.

Fotos: se siguen guardando en `checklist-evidencias` (bucket privado), visibles según las reglas actuales.
