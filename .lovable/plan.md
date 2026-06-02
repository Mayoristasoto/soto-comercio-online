## Manual de Capacitación Editable para Gerentes de Sucursal

Crear una sección donde admin_rrhh pueda **editar el contenido del instructivo** y **descargarlo como PDF** para capacitar a los gerentes de sucursal sobre acceso al sistema y aprobación de vacaciones.

### Objetivo
Tener un manual vivo que se pueda modificar conforme cambien procedimientos, sin tocar código, y exportar a PDF corporativo cuando se necesite imprimir o enviar.

### Componentes a crear

**1. Tabla en base de datos: `instructivos_editables`**
- `id`, `slug` (ej: "gerente-vacaciones"), `titulo`, `descripcion`
- `secciones` (jsonb) — array de `{ id, titulo, contenido_html, orden }`
- `actualizado_por`, `actualizado_en`, `version`
- RLS: lectura para roles `gerente_sucursal` y `admin_rrhh`; escritura solo `admin_rrhh`
- GRANTs estándar + seed inicial con el contenido del manual ya redactado (acceso al sistema, dashboard gerente, flujo de aprobación 1ra instancia, reglas de negocio, FAQs, buenas prácticas)

**2. Página `src/pages/InstructivoGerente.tsx` → ruta `/instructivo/gerente`**
- Vista en accordion con las secciones cargadas desde la BD
- Botón **"Descargar PDF"** (visible a gerentes y admin)
- Botón **"Editar manual"** (solo `admin_rrhh`) que abre modo edición

**3. Modo edición inline (mismo componente)**
- Editor por sección con `Textarea` enriquecido (markdown simple: negritas, listas, encabezados — usando `react-markdown` para preview)
- Acciones: agregar sección, eliminar, reordenar (flechas arriba/abajo), editar título y contenido
- Guardado por sección o "Guardar todo" → upsert en `instructivos_editables`
- Indicador de "última modificación: {usuario} - {fecha}"

**4. Generador PDF `src/utils/instructivoGerentePDF.ts`**
- `jsPDF` + `autoTable`, paleta corporativa (#4b0d6d, #95198d, #e04403)
- Portada con título, fecha, versión
- Índice automático de secciones
- Render markdown → texto formateado en PDF (encabezados, listas con bullets, negritas)
- Pie de página con paginación y "Mayorista Soto - RRHH"

**5. Registro de ruta**
- Agregar `/instructivo/gerente` en `src/App.tsx`
- Agregar link en sidebar para roles `gerente_sucursal` y `admin_rrhh` (módulo "Capacitación" o dentro de Vacaciones)

### Detalles técnicos

```text
DB
└── instructivos_editables (jsonb secciones, versionado simple)
        ▲
        │ select (gerente_sucursal, admin_rrhh)
        │ update (admin_rrhh)
        │
UI /instructivo/gerente
├── Vista accordion (todos)
├── Botón Descargar PDF (todos)
└── Modo Editar (solo admin_rrhh)
    ├── Editor markdown por sección
    ├── Reordenar / agregar / eliminar
    └── Guardar → upsert
```

Contenido inicial seed: las 6 secciones ya redactadas en el mensaje anterior (Acceso, Dashboard, Aprobación 1ra instancia paso a paso, Reglas de negocio, FAQs, Buenas prácticas).

### Fuera de alcance
- Versionado histórico completo (solo se guarda última versión + autor/fecha)
- Editor WYSIWYG visual (se usa markdown simple, suficiente para RRHH)
- Adjuntar imágenes/screenshots editables (se puede agregar después si lo necesitan)