

# Firma obligatoria de documentos tras primer ingreso

## Flujo propuesto

```text
Empleado ingresa con PIN (primera vez)
        |
        v
  Cambio de contrasena obligatorio (ForcedPasswordChange - ya existe)
        |
        v
  Firma obligatoria de documentos (NUEVO - ForcedDocumentSigning)
        |
        v
  Dashboard del empleado
```

## Que se va a hacer

### 1. Nuevo componente: `ForcedDocumentSigning.tsx`

Un dialog modal (similar al ForcedPasswordChange) que:
- Bloquea el acceso al dashboard hasta que se firmen todos los documentos obligatorios pendientes
- Muestra los documentos asignados al empleado que requieren firma (reglamento interno, descripcion de puestos, etc.)
- Permite ver cada documento (iframe o contenido de texto) y firmarlo con la firma digital existente (SignaturePad)
- Muestra progreso: "2 de 3 documentos firmados"
- Solo se cierra cuando todos los documentos pendientes estan firmados

El componente reutilizara la logica existente de `DocumentSignature` y `SignaturePad` para la firma.

### 2. Modificar `EmpleadoDashboard.tsx`

- Agregar verificacion de documentos obligatorios pendientes de firma despues del cambio de contrasena
- Consultar `asignaciones_documentos_obligatorios` del empleado y cruzar con `documentos_firmas` para detectar pendientes
- Si hay documentos sin firmar, mostrar el modal `ForcedDocumentSigning` (solo si ya no debe cambiar contrasena)
- El flujo queda secuencial: primero password, luego documentos

### 3. Agregar campo en tabla `empleados` (migracion SQL)

- Nuevo campo `debe_firmar_documentos_iniciales` (boolean, default false)
- Se marca como `true` cuando el empleado es creado o cuando el admin lo indica
- Se marca como `false` automaticamente cuando firma todos los documentos obligatorios asignados
- El `pin-first-login` edge function tambien marcara este campo como `true` junto con `debe_cambiar_password`

### 4. Actualizar edge function `pin-first-login`

- Agregar `debe_firmar_documentos_iniciales: true` en el update del empleado al hacer primer login con PIN

## Detalle tecnico

### Nuevo componente `ForcedDocumentSigning`

```typescript
// Props
interface ForcedDocumentSigningProps {
  empleadoId: string
  onAllDocumentsSigned: () => void
}
```

- Consulta documentos obligatorios asignados sin firma
- Muestra lista con estado (pendiente/firmado)
- Al hacer click en un documento: abre vista previa + boton firmar
- Usa DocumentSignature internamente para el proceso de firma
- Cuando todos estan firmados, actualiza `debe_firmar_documentos_iniciales = false` y llama callback

### Migracion SQL

```sql
ALTER TABLE empleados 
ADD COLUMN debe_firmar_documentos_iniciales boolean DEFAULT false;
```

### Archivos modificados/creados

| Archivo | Accion |
|---------|--------|
| `src/components/employee/ForcedDocumentSigning.tsx` | Crear - modal obligatorio de firma |
| `src/pages/EmpleadoDashboard.tsx` | Modificar - agregar verificacion y mostrar modal |
| `supabase/functions/pin-first-login/index.ts` | Modificar - marcar campo en primer login |
| Migracion SQL | Crear - agregar columna a empleados |

### Notas

- Los documentos que se muestran son los que ya estan asignados al empleado via `asignaciones_documentos_obligatorios` (reglamento interno, descripcion de puestos, etc.)
- El admin debe asignar estos documentos previamente desde el panel de administracion
- La firma usa el sistema existente (SignaturePad + documentos_firmas)
