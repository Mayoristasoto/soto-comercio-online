
## Resumen

Tres mejoras al módulo de Vacaciones:

1. **Plantillas:** ya se editan desde Configuración → "Plantillas Doc.". Vamos a reforzar que aparezca **logo de la empresa** y **nombre del empleado** en el PDF (independiente de lo que escriba el usuario en la plantilla).
2. **Editor de plantillas:** mejorar el acceso (link directo desde el módulo de Vacaciones) y dejar visible el logo en la vista previa.
3. **Carga manual de vacaciones por admin_rrhh** desde el calendario, con elección de estado (pendiente / aprobada / gozadas / rechazada).

---

## 1) Logo + nombre del empleado en el PDF

Archivo: `src/utils/constanciaVacacionesPDF.ts`

- Insertar el logo `public/logo-soto.jpeg` (ya existente, definido en `COMPANY_INFO.logo` de `src/utils/pdfStyles.ts`) en la esquina superior izquierda de cada constancia, usando `doc.addImage()` con conversión previa a base64.
- Bajo el header agregar un bloque fijo con:
  - **Empleado:** Nombre Apellido
  - **DNI / Legajo / Sucursal** (si están disponibles)
  
  Este bloque se renderiza **siempre**, aunque la plantilla HTML no incluya las variables, así no depende de que el admin las recuerde.
- El cuerpo HTML editable de la plantilla se mantiene debajo de ese bloque.

## 2) Acceso al editor de plantillas

Archivo: `src/pages/Vacaciones.tsx` (módulo de vacaciones)

- Agregar un botón **"Editar plantillas de constancias"** (solo visible para `admin_rrhh`) que lleve a `/configuracion?tab=plantillas`.
- En `src/pages/ConfiguracionAdmin.tsx`: leer `?tab=` de la URL para abrir directamente la pestaña "Plantillas Doc.".

Archivo: `src/components/admin/PlantillasDocumentosManager.tsx`

- En la vista previa mostrar el logo arriba (mismo que en el PDF) para que se vea representativo del resultado final.
- Agregar nota explicativa: "El logo y los datos del empleado se imprimen automáticamente; no hace falta incluirlos en el texto".

## 3) Carga manual de vacaciones (admin_rrhh) desde el calendario

Archivo nuevo: `src/components/vacaciones/CargaManualVacacionesDialog.tsx`

- Dialog con formulario:
  - Selector de empleado (combobox con búsqueda, reutilizar la lista `empleadosLista` ya cargada en `CalendarioVacaciones`).
  - `fecha_inicio`, `fecha_fin` (defaultean al día clickeado).
  - **Estado inicial:** Select con opciones **Pendiente / Aprobada / Gozadas / Rechazada**.
  - Comentario opcional.
- Al guardar inserta en `solicitudes_vacaciones` con `empleado_id`, fechas, `estado` elegido, y si el estado != pendiente: setea `aprobado_por = empleado actual` y `fecha_aprobacion = now()`. Valida conflictos como ya hace `handleReasignar`.

Archivo: `src/components/vacaciones/CalendarioVacaciones.tsx`

- Agregar botón **"+ Cargar vacaciones"** arriba del calendario (solo `admin_rrhh`) que abre el dialog.
- También permitir abrirlo desde el click en un día vacío del calendario (admin_rrhh).
- Después de guardar, refrescar el calendario.

**Cambio de estado existente:** ya se puede cambiar desde el popover (handleCambioEstado soporta pendiente/aprobada/rechazada). Sumamos **"gozadas"** como opción adicional en ese popover para vacaciones aprobadas.

---

## Detalles técnicos

- No requiere migración: `solicitudes_vacaciones` ya tiene los campos `estado`, `empleado_id`, `aprobado_por`, `fecha_aprobacion`, `comentarios_aprobacion`.
- El logo se carga vía `fetch('/logo-soto.jpeg')` → `FileReader` → dataURL, cacheado en memoria para no recargar entre PDFs.
- RLS: `solicitudes_vacaciones` ya permite a admin_rrhh insertar/actualizar; no se toca.

## Archivos afectados

- Modificados: `src/utils/constanciaVacacionesPDF.ts`, `src/components/admin/PlantillasDocumentosManager.tsx`, `src/pages/ConfiguracionAdmin.tsx`, `src/pages/Vacaciones.tsx`, `src/components/vacaciones/CalendarioVacaciones.tsx`.
- Nuevo: `src/components/vacaciones/CargaManualVacacionesDialog.tsx`.
