# Checklist de Control (módulo RRHH)

Nuevo módulo para hacer controles sobre sucursales, con ítems evaluados en tres estados, observaciones y fotos como evidencia. Acceso exclusivo de RRHH (admin_rrhh).

## Cómo funciona

1. **Nuevo control**: se elige sucursal, fecha/hora (por defecto ahora), y opcionalmente los encargados de turno presentes en ese control (uno o varios empleados de la sucursal, marcados como responsables). Se puede partir de una **plantilla** de checklist o armar los ítems a mano; además, sobre una plantilla se pueden agregar ítems extra.
2. **Carga de ítems**: cada ítem se marca como **Cumple** (verde), **Cumple Parcial** (amarillo) o **No Cumple** (rojo), con campo de observaciones y carga de una o varias fotos (vista previa en miniatura y botón para eliminar cada foto).
3. **Resumen visual**: mientras se carga y al consultarlo, se muestran contadores por estado (Cumple / Parcial / No Cumple), total de ítems, ítems sin evaluar y un porcentaje de cumplimiento.
4. **Estados del control**: `borrador` (editable) y `cerrado` (solo lectura). Cerrar requiere que todos los ítems estén evaluados. Un control cerrado puede reabrirse por RRHH si hace falta corregir.
5. **Historial**: listado de controles con filtros por sucursal, rango de fechas, estado y responsable, con acceso al detalle y exportación a PDF del control.
6. **Plantillas**: sección para crear/editar plantillas de checklist (nombre, descripción, ítems ordenados agrupables por sección).

## Permisos

- Solo el rol `admin_rrhh` puede crear, editar, consultar, cerrar y reabrir controles y administrar plantillas.
- El resto de roles no ve el módulo ni accede a los datos (bloqueo en RLS y en la navegación).

## Navegación

Nueva entrada **RRHH → Checklist de Control** en el sidebar, con rutas:
- `/rrhh/checklist` — historial + botón "Nuevo control"
- `/rrhh/checklist/nuevo` y `/rrhh/checklist/:id` — carga/detalle del control
- `/rrhh/checklist/plantillas` — administración de plantillas

## Detalles técnicos

**Base de datos** (migración, todas con GRANT a `authenticated`/`service_role` y RLS restringida a `has_role(auth.uid(),'admin_rrhh')`):

- `checklist_plantillas` — nombre, descripcion, activo, created_by
- `checklist_plantilla_items` — plantilla_id, texto, seccion, orden, obligatorio
- `checklist_controles` — sucursal_id, fecha_hora, responsable_id (usuario RRHH), estado (`borrador`/`cerrado`), observaciones_generales, cerrado_at/cerrado_por, created_at/updated_at + trigger
- `checklist_control_encargados` — control_id, empleado_id (encargados de turno presentes)
- `checklist_control_items` — control_id, texto, seccion, orden, estado enum `checklist_estado_item` (`cumple`/`parcial`/`no_cumple`, nullable hasta evaluarse), observaciones
- `checklist_item_fotos` — item_id, storage_path, uploaded_by, created_at
- Enum nuevo: `checklist_estado_item`

**Storage**: bucket privado `checklist-evidencias` (límite de tamaño por archivo), políticas en `storage.objects` para que solo `admin_rrhh` suba/lea/borre; las imágenes se muestran con signed URLs.

**Frontend** (reutilizando shadcn/Tailwind y tokens existentes, sin colores hardcodeados):
- `src/pages/ChecklistControles.tsx` (historial), `src/pages/ChecklistControlDetalle.tsx` (carga/detalle), `src/pages/ChecklistPlantillas.tsx`
- `src/components/checklist/ChecklistItemRow.tsx` (estados + observaciones + fotos), `EvidenciaUploader.tsx` (patrón de `ImageUpload`/`FotosVerificacionViewer`), `ResumenChecklist.tsx`, `NuevoControlDialog.tsx`, `SelectorEncargados.tsx`
- Hook `src/hooks/useChecklistControles.ts` para consultas y mutaciones
- Rutas nuevas en `src/App.tsx` y entrada en el sidebar (`app_pages` + `AdminSidebar`)
- Export PDF del control con `src/utils/pdfStyles.ts` y la paleta corporativa
