

## Plan: Activar/Desactivar Secciones desde Vista Roles

### Que cambia

Reemplazar los iconos de candado estaticos por **Switch toggles** interactivos en cada item del sidebar y cada seccion del dashboard. Al hacer toggle, se actualiza la visibilidad real del sistema.

### Implementacion

#### Sidebar items (conectado a `app_pages`)

1. **Cargar datos reales**: Query `app_pages` al montar el componente
2. **Renderizar switches**: Cada item del sidebar muestra un `Switch` en vez del icono Lock/Unlock
3. **Al toggle**: Actualizar `roles_permitidos` en `app_pages` -- agregar o quitar el rol seleccionado del array
4. **Feedback**: Toast de confirmacion tras cada cambio

#### Dashboard sections (nueva tabla)

1. **Crear tabla `role_dashboard_sections`**: con campos `id`, `rol` (text), `seccion_key` (text), `habilitado` (boolean), `created_at`, `updated_at`
2. **Cargar config**: Al seleccionar un rol, leer las secciones habilitadas
3. **Switch toggle**: Al cambiar, upsert en la tabla
4. **Seed inicial**: Insertar registros por defecto para las secciones actuales (todas habilitadas)

#### Archivo modificado: `src/components/admin/RolePreview.tsx`

- Importar `Switch`, `supabase`, `useToast`
- Estado: `app_pages` cargados, `dashboardConfig` cargado
- Sidebar: mapear `app_pages` reales, mostrar Switch que modifica `roles_permitidos`
- Dashboard: mapear secciones hardcodeadas + config de BD, Switch que modifica `role_dashboard_sections`
- Boton "Guardar cambios" o guardado instantaneo por toggle

#### DB migration

```sql
CREATE TABLE role_dashboard_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL,
  seccion_key TEXT NOT NULL,
  habilitado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rol, seccion_key)
);

ALTER TABLE role_dashboard_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON role_dashboard_sections
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

### Archivos

| Archivo | Accion |
|---------|--------|
| `src/components/admin/RolePreview.tsx` | Modificado -- switches interactivos, queries a BD |
| Migration SQL | Nueva tabla `role_dashboard_sections` |

