## Objetivo

Permitir imprimir dos constancias de vacaciones desde el módulo de Vacaciones:
1. **Constancia de Otorgamiento** — al aprobar una solicitud (firma previa al inicio).
2. **Constancia de Goce** — disponible siempre que la solicitud esté aprobada (firma posterior al retorno).

Ambas plantillas se podrán editar desde una nueva pestaña en Configuración, con editor de texto enriquecido y variables `{{...}}`.

## Plantillas detectadas (texto base)

**Otorgamiento:**
> Mar del Plata, {{fecha_hoy}}.
> Por medio de la presente, tomo conocimiento de las vacaciones que me fueran otorgadas desde el {{fecha_inicio}} hasta el {{fecha_fin}}, inclusive.
> Por lo tanto, me reincorporaré a mis tareas el {{fecha_reintegro}}.
> Firma: / Aclaración: {{empleado}} / DNI: {{dni}}

**Goce:**
> Mar del Plata, {{fecha_hoy}}.
> Por medio de la presente, dejo constancia de haber gozado mis vacaciones desde el {{fecha_inicio}} hasta el {{fecha_fin}}, inclusive. Habiendo retomado mis tareas en el día de la fecha.
> Firma: / Aclaración: {{empleado}} / DNI: {{dni}}

## Variables disponibles

`{{empleado}}` (Nombre Apellido), `{{dni}}`, `{{legajo}}`, `{{sucursal}}`, `{{puesto}}`, `{{fecha_inicio}}` (con día semana en texto), `{{fecha_fin}}`, `{{fecha_reintegro}}` (día hábil siguiente a fecha_fin), `{{dias}}`, `{{fecha_hoy}}`, `{{ciudad}}` (default "Mar del Plata").

## Cambios técnicos

### Base de datos (migración)
Nueva tabla `plantillas_documentos`:
- `codigo` text unique (`vacaciones_otorgamiento`, `vacaciones_goce`)
- `nombre` text, `descripcion` text
- `contenido_html` text (cuerpo del documento)
- `ciudad_default` text default 'Mar del Plata'
- `activa` boolean default true
- `updated_by` uuid, timestamps
- GRANTs: SELECT para authenticated, ALL para service_role
- RLS: SELECT para todos los autenticados; INSERT/UPDATE solo `admin_rrhh` (vía `has_role`)
- Seed con los dos códigos y el HTML inicial extraído de los .docx

### Editor de plantillas
- Nueva pestaña **"Plantillas Doc."** en `src/pages/ConfiguracionAdmin.tsx`
- Componente `src/components/admin/PlantillasDocumentosManager.tsx`:
  - Lista las plantillas, selector entre Otorgamiento / Goce
  - Editor rich-text liviano (usar `<textarea>` con preview HTML + barra simple de negrita/cursiva/lista) — sin dependencias nuevas pesadas
  - Panel lateral con las variables disponibles (click para copiar al portapapeles)
  - Campo "Ciudad por defecto"
  - Botón "Vista previa" que renderiza con datos de muestra
  - Botón "Restaurar plantilla original"

### Generación PDF
- Nuevo `src/utils/constanciaVacacionesPDF.ts`:
  - `generarConstanciaPDF(tipo: 'otorgamiento'|'goce', solicitud, empleado)` 
  - Carga plantilla desde Supabase, reemplaza `{{variables}}`, renderiza con jsPDF + html2canvas (igual patrón que `comprobanteVacacionesPDF.ts`)
  - Formato carta, fuente serif, encabezado con logo corporativo, pie con firma/aclaración/DNI
  - Fechas en español con día de la semana (`format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })`)
  - `fecha_reintegro` = primer día hábil después de `fecha_fin` (skip domingos)

### Integración en UI
Botones "Imprimir constancia" en:
1. **`AprobacionVacaciones.tsx`**: tras aprobar → dropdown/botón "Otorgamiento" automático en el item recién aprobado
2. **`CalendarioVacaciones.tsx`**: al click sobre una vacación aprobada en el calendario, agregar al popover/dialog dos botones:
   - "Constancia Otorgamiento" (siempre que esté aprobada)
   - "Constancia Goce" (siempre que esté aprobada — según preferencia indicada)
3. **`MisVacaciones.tsx`**: misma pareja de botones en cada solicitud aprobada del empleado

## Archivos a crear/editar

**Nuevos:**
- `supabase/migrations/<timestamp>_plantillas_documentos.sql`
- `src/components/admin/PlantillasDocumentosManager.tsx`
- `src/utils/constanciaVacacionesPDF.ts`
- `src/components/vacaciones/ConstanciaVacacionesButtons.tsx` (botones reutilizables)

**Editados:**
- `src/pages/ConfiguracionAdmin.tsx` — agregar tab
- `src/components/vacaciones/CalendarioVacaciones.tsx` — botones en detalle
- `src/components/vacaciones/AprobacionVacaciones.tsx` — botón post-aprobación
- `src/components/vacaciones/MisVacaciones.tsx` — botones por solicitud

## Fuera de alcance
- No se modifica el flujo de aprobación existente.
- No se firma digitalmente; los campos Firma/Aclaración/DNI quedan en blanco para firma manual.
- No se almacena el PDF generado; se descarga al hacer click.
