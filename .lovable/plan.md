

## Plan: OCR para PDFs escaneados en el Importador F931

### Problema
El importador actual solo acepta CSV/Excel. El usuario tiene el F931 escaneado como PDF y necesita extraer los datos con OCR.

### Solución
Crear una edge function que reciba el PDF, lo envíe a **Lovable AI (Gemini)** con capacidad de visión para extraer la tabla de datos del F931 como JSON estructurado, y devuelva los registros parseados al frontend.

### Arquitectura

```text
Frontend (PDF) → Edge Function "ocr-f931" → Lovable AI (Gemini Vision)
                                           → Devuelve JSON con filas
Frontend ← JSON rows ← Edge Function
Frontend → Inserta en importacion_f931 (lógica existente)
```

### Archivos

**1. Nueva Edge Function: `supabase/functions/ocr-f931/index.ts`**
- Recibe el PDF como base64 en el body junto con `periodo_id`
- Envía las páginas del PDF a Gemini 2.5 Pro (multimodal) via Lovable AI Gateway
- Prompt: "Extraer tabla del F931 argentino. Devolver array JSON con campos: CUIL, Apellido, Nombre, Remuneracion, Aportes, Contribuciones"
- Usa tool calling para forzar output estructurado
- Devuelve el array de registros extraídos

**2. Modificar: `src/components/rentabilidad/ImportadorF931.tsx`**
- Agregar `.pdf` al accept del input de archivo
- Detectar si el archivo es PDF
- Si es PDF: convertir a base64, llamar a la edge function `ocr-f931`, recibir las filas JSON y procesarlas con la misma lógica de mapeo por CUIL existente
- Si es CSV/Excel: mantener el flujo actual sin cambios
- Mostrar estado "Procesando OCR..." durante la extracción
- Mostrar preview de los datos extraídos antes de confirmar la importación

**3. Actualizar: `supabase/config.toml`**
- Agregar entrada para la nueva función con `verify_jwt = false`

### Flujo del usuario
1. Selecciona período
2. Sube PDF escaneado del F931
3. Ve spinner "Procesando OCR..."
4. Aparece tabla preview con los datos extraídos por OCR
5. Revisa y confirma → se insertan en `importacion_f931` con el mapeo por CUIL habitual

### Notas
- Se usa `LOVABLE_API_KEY` que ya está configurada como secret
- Gemini 2.5 Pro es ideal para este caso por su capacidad multimodal con tablas
- El PDF se envía como base64 (limite ~20MB)
- No requiere cambios de schema en la DB

