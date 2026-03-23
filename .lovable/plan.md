

## Plan: Switch para desactivar tareas de limpieza en Operaciones → Tareas

### Cambio

**`src/pages/Tareas.tsx`**

Agregar un Switch (toggle) en la pestaña "Limpieza" que controle un flag global `limpieza_activa` en una tabla de configuración. Cuando está desactivado, el kiosco no muestra alertas de limpieza ni las incluye en la confirmación de salida.

**Implementación**:

1. **Tabla de configuración**: Usar `configuracion_sistema` (si existe) o insertar un registro en una tabla simple. Verificar si ya hay una tabla de config del sistema.

2. **En `src/pages/Tareas.tsx`**: Dentro del `TabsContent value="limpieza"`, agregar arriba del `LimpiezaConfig` un bloque con:
   - Switch con label "Tareas de limpieza activas"
   - Descripción: "Cuando está desactivado, no se mostrarán alertas de limpieza en el kiosco"
   - Lee/escribe el campo `activo` de todas las asignaciones en `limpieza_asignaciones` (bulk toggle)

3. **Alternativa sin nueva tabla**: El switch simplemente hace `UPDATE limpieza_asignaciones SET activo = true/false` para TODAS las asignaciones de una vez. El RPC `kiosk_get_limpieza_hoy` ya filtra por `activo = true`, así que al desactivarlas todas, el kiosco deja de mostrarlas automáticamente.

### Enfoque elegido: Bulk toggle sobre campo `activo` existente

No requiere nueva tabla ni migración. Solo cambio en `src/pages/Tareas.tsx`:

- Agregar un `Switch` de `@/components/ui/switch` antes del `LimpiezaConfig`
- Estado inicial: `true` si hay al menos una asignación con `activo = true`
- Al togglear OFF: `UPDATE limpieza_asignaciones SET activo = false`
- Al togglear ON: `UPDATE limpieza_asignaciones SET activo = true`
- Toast de confirmación

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `src/pages/Tareas.tsx` | Agregar Switch + lógica toggle bulk |

