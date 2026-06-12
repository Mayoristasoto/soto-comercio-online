# Unificación de Plantillas de Documentos

## Objetivo
Tener **un solo sistema de plantillas** que sirva tanto para constancias de vacaciones, notas internas, entregas de elementos (uniformes, calzado), y cualquier documento futuro que se quiera imprimir desde la app. Hoy hay dos sistemas separados (`plantillas_documentos` y `plantillas_elementos`) y la UI está dividida en dos tabs distintas.

## Resultado final
- Una sola tabla maestra de plantillas con **categorías** (vacaciones, entregas, notas generales, sanciones, etc.).
- Un solo administrador en Configuración → "Plantillas de Documentos" donde admin/admin_rrhh pueden:
  - Ver todas las plantillas existentes agrupadas por categoría.
  - **Crear nuevas plantillas** (no solo editar las predefinidas).
  - Editar, activar/desactivar y eliminar las que no sean del sistema.
  - Definir qué variables usa cada plantilla.
- Generación de PDF unificada: logo + datos del empleado en el encabezado automático (igual que hoy en vacaciones) + cuerpo HTML configurable.
- Las entregas de elementos pasan a imprimirse con el mismo motor de PDF (logo, datos del empleado, firma).

## Cambios

### 1. Base de datos (migración)
- Extender `plantillas_documentos`:
  - `categoria` (text): `'vacaciones' | 'entregas' | 'sanciones' | 'notas' | 'otros'`.
  - `tipo_elemento` (text, opcional): para plantillas de entregas (remera, buzo, etc.).
  - `es_sistema` (bool): true para las predefinidas (no se pueden borrar).
  - `variables_extra` (jsonb): variables custom por plantilla además de las estándar.
- Migrar las filas de `plantillas_elementos` activas hacia `plantillas_documentos` con `categoria = 'entregas'`.
- Mantener `plantillas_elementos` por compatibilidad pero marcarla como legacy (sin borrar datos).
- Seed: agregar plantillas adicionales útiles (ej. "Notificación de sanción", "Constancia de trabajo", "Recibo de entrega de uniforme").

### 2. Generador de PDF (`src/utils/constanciaVacacionesPDF.ts` → renombrar a `documentoPDF.ts`)
- Generalizar la función para que acepte cualquier plantilla por código.
- Mantener el encabezado con logo + bloque empleado.
- Soportar variables extra (ej. `{{elemento}}`, `{{cantidad}}`, `{{talla}}` para entregas).
- Wrapper retrocompatible para no romper las llamadas actuales en vacaciones.

### 3. Administrador unificado (`PlantillasDocumentosManager.tsx`)
- Filtro/selector por categoría.
- Botón **"+ Nueva plantilla"** con diálogo (nombre, código, categoría, tipo de elemento si aplica, HTML, ciudad, variables extra).
- Botones eliminar/duplicar (solo si `es_sistema = false`).
- Editor actual de HTML con panel de variables y vista previa se mantiene.

### 4. Configuración → Tabs
- Quitar el tab separado "Plantillas Elementos" y dejar un único tab **"Plantillas de Documentos"**.
- Dentro del tab, sub-pestañas por categoría.

### 5. Entregas de elementos (`EntregasEmpleados.tsx`)
- Al imprimir comprobante de entrega, usar el motor unificado eligiendo la plantilla de categoría `entregas` correspondiente al tipo de elemento (o una genérica si no hay específica).
- Reemplazar el render HTML actual por el PDF unificado con logo + datos del empleado.

## Detalles técnicos

```text
plantillas_documentos
├── id, codigo (unique), nombre, descripcion
├── categoria         ← NUEVO
├── tipo_elemento     ← NUEVO (nullable)
├── es_sistema        ← NUEVO (default false)
├── variables_extra   ← NUEVO (jsonb)
├── contenido_html, ciudad_default
└── activa, created_at, updated_at, updated_by
```

GRANTs y RLS: mantener el patrón actual (lectura authenticated, escritura admin/admin_rrhh vía `has_role`).

## Fuera de alcance
- No se toca el flujo de firma digital ni la aprobación de entregas, solo el render del PDF.
- No se elimina `plantillas_elementos` en esta iteración (migración de datos sí, drop después).

## Preguntas antes de implementar
1. ¿Querés que las plantillas nuevas que crees puedan tener **encabezado personalizado** (ej. ocultar logo, cambiar el bloque de datos del empleado), o siempre mantener el encabezado estándar con logo + empleado?
2. Para entregas de elementos, ¿querés **una plantilla por tipo** (remera, buzo, calzado…) o **una sola plantilla genérica de entrega** que reciba el tipo como variable?
3. ¿Sumamos alguna plantilla específica al seed inicial (ej. constancia de trabajo, sanción disciplinaria, preaviso)? Decime cuáles y las dejo listas.
