# Plan: Comprobante de entrega imprimible

## Objetivo
Cuando en la matriz de `/rrhh/entregas` se marque una celda como **entregado**, ofrecer la opción de imprimir un comprobante. La plantilla del comprobante debe ser personalizable por el usuario administrador.

## Decisiones de diseño

- Reutilizar la tabla existente `plantillas_elementos` (ya tiene `template_html`, variables tipo `{{empleado_nombre}}`, etc.) para no duplicar lógica.
- Vincular cada item del catálogo (`entregas_items`) con una plantilla por defecto opcional → nueva columna `plantilla_id`.
- Solo se ofrece imprimir cuando el cambio es a estado **entregado** (no aplica para "pendiente" ni "no_aplica").

## Cambios

### 1. Base de datos (migración)
- Agregar columna `plantilla_id uuid` (nullable, FK a `plantillas_elementos`) en `entregas_items`.
- Agregar columnas opcionales en `entregas_empleado` para trazabilidad de impresión:
  - `comprobante_impreso boolean default false`
  - `comprobante_impreso_at timestamptz`

### 2. UI — Matriz `EntregasEmpleados.tsx`
- Al hacer click y pasar a estado **entregado**, mostrar un `AlertDialog` con:
  - "¿Imprimir comprobante de entrega?" — Botones: **Imprimir** / **Solo registrar**.
- Si elige Imprimir:
  - Resolver plantilla: `entregas_items.plantilla_id` → si no hay, mostrar selector de plantilla del listado activo.
  - Renderizar HTML con reemplazos (`{{empleado_nombre}}`, `{{legajo}}`, `{{fecha}}`, `{{tipo_elemento}}`, `{{item}}`, `{{observaciones}}`) y abrir `window.open` para imprimir (mismo patrón que `EntregaElementosImprimir.tsx`).
  - Marcar `comprobante_impreso = true`.

### 3. UI — Diálogo "Gestionar items"
- En el formulario de cada item, agregar `Select` de **Plantilla por defecto** (opcional) listando `plantillas_elementos` activas.

### 4. Personalización de plantillas
- Agregar botón **"Editar plantillas"** en la página `/rrhh/entregas` que abra un diálogo CRUD sobre `plantillas_elementos`:
  - Campos: nombre, tipo_elemento, template_html (textarea grande con ayuda de variables disponibles), activo.
  - Vista previa en vivo del HTML renderizado con datos de ejemplo.
- Reutilizable: ya existe `plantillas_elementos`, solo se agrega UI dedicada en este módulo.

## Archivos a tocar
- `supabase/migrations/<nuevo>.sql` — columnas nuevas.
- `src/pages/EntregasEmpleados.tsx` — flujo de impresión + selector de plantilla por item + acceso a editor.
- `src/components/admin/PlantillasEntregaDialog.tsx` (nuevo) — CRUD + vista previa de plantillas.

## Fuera de alcance
- No se modifica el módulo viejo `EntregaElementosImprimir.tsx`.
- No se cambian permisos RLS existentes de `plantillas_elementos`.
