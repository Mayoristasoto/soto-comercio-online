

# Fix: Mostrar estado activo en plantilla "Control Ofertas"

## Problema

La plantilla "Control Ofertas" esta guardada correctamente en la base de datos como **activa**, con gerente y sucursal asignados. Sin embargo, la UI solo muestra un badge cuando la plantilla esta **inactiva** -- no hay indicador visual para el estado activo, lo que genera confusion.

## Solucion

### Archivo: `src/components/tasks/TaskTemplates.tsx`

Agregar un badge verde "Activa" visible cuando la plantilla esta activa, para que el usuario siempre vea el estado:

**Cambio en la seccion de badges (linea ~420):**

- Reemplazar la logica que solo muestra "Inactiva" por una que muestre ambos estados:
  - **Activa**: Badge verde con texto "Activa"
  - **Inactiva**: Badge gris con texto "Inactiva" (como esta ahora)

```text
Antes:
  Solo se muestra badge "Inactiva" cuando activa=false

Despues:
  Se muestra "Activa" (verde) o "Inactiva" (gris) siempre
```

### Detalle tecnico

Reemplazar lineas 420-422:
```typescript
// Antes:
{!plantilla.activa && (
  <Badge variant="secondary">Inactiva</Badge>
)}

// Despues:
<Badge variant={plantilla.activa ? "default" : "secondary"} 
       className={plantilla.activa ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
  {plantilla.activa ? "Activa" : "Inactiva"}
</Badge>
```

**Archivo modificado:**
- `src/components/tasks/TaskTemplates.tsx` - mostrar badge de estado activo/inactivo siempre visible

