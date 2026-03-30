

## Plan: Tablero Kanban de Gestión de Proyectos (estilo Trello)

### Concepto
Nueva sección "Tablero de Proyectos" accesible para admins, con un board Kanban drag-and-drop donde se pueden crear tarjetas (ideas, tareas estratégicas, proyectos), moverlas entre columnas (etapas), y delegarlas a gerentes de sucursal con seguimiento.

### Etapa 1 — Tablero Kanban (Trello-like)

```text
┌─ Tablero de Proyectos ──────────────────────────────────────────────────┐
│ [+ Nueva Columna]  [Filtros ▼]  [Buscar...]                            │
│                                                                          │
│ 💡 Ideas        │ 📋 Por Hacer    │ 🔄 En Progreso  │ ✅ Completado     │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐  │
│ │ Renovar     │ │ │ Actualizar  │ │ │ Capacitación│ │ │ Uniformes   │  │
│ │ cartelería  │ │ │ precios     │ │ │ atención    │ │ │ nuevos      │  │
│ │ 🏷 Marketing│ │ │ 🏷 Operac.  │ │ │ al cliente  │ │ │             │  │
│ │ 👤 Sin asig.│ │ │ 👤 Matías   │ │ │ 👤 Laura    │ │ │ 📅 15/03    │  │
│ │ ⚡ Media     │ │ │ ⚡ Alta      │ │ │ ⚡ Alta      │ │ │ ✅ Delegada  │  │
│ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └─────────────┘  │
│ ┌─────────────┐ │                 │                 │                  │
│ │ Horario     │ │                 │                 │                  │
│ │ extendido   │ │                 │                 │                  │
│ │ sábados     │ │                 │                 │                  │
│ └─────────────┘ │                 │                 │                  │
│ [+ Tarjeta]     │ [+ Tarjeta]     │ [+ Tarjeta]     │                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Etapa 2 (futuro) — Funciones tipo JIRA
- Subtareas y checklists dentro de cada tarjeta
- Etiquetas/labels personalizables
- Comentarios y actividad por tarjeta
- Fechas de vencimiento con alertas
- Adjuntos y archivos
- Vistas alternativas: lista, timeline/Gantt
- Sprints y épicas

### Base de datos — Nueva tabla `tablero_tarjetas`

```sql
CREATE TABLE public.tablero_columnas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES empleados(id)
);

CREATE TABLE public.tablero_tarjetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  columna_id UUID REFERENCES tablero_columnas(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad tarea_prioridad DEFAULT 'media',
  categoria_id UUID REFERENCES tareas_categorias(id),
  delegado_a UUID REFERENCES empleados(id),        -- gerente asignado
  created_by UUID REFERENCES empleados(id),
  fecha_limite DATE,
  orden INT NOT NULL DEFAULT 0,
  etiquetas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: solo admin_rrhh puede CRUD completo, gerentes ven las delegadas a ellos
```

### Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/pages/TableroProyectos.tsx` | Página principal con el board Kanban |
| `src/components/tablero/KanbanBoard.tsx` | Board con columnas drag-and-drop |
| `src/components/tablero/KanbanColumn.tsx` | Columna individual con lista de tarjetas |
| `src/components/tablero/KanbanCard.tsx` | Tarjeta individual (título, prioridad, asignado, categoría) |
| `src/components/tablero/TarjetaDetailModal.tsx` | Modal de detalle al hacer click en una tarjeta |
| `src/components/tablero/NuevaTarjetaDialog.tsx` | Dialog para crear/editar tarjeta |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar ruta `/tablero-proyectos` |
| Migración BD | Crear tablas `tablero_columnas` y `tablero_tarjetas` + RLS + columnas default |
| `app_pages` (datos) | INSERT entrada de navegación para sidebar |

### Funcionalidad Etapa 1
- **Drag & drop** de tarjetas entre columnas (usando `@dnd-kit/core`)
- **Columnas default**: Ideas → Por Hacer → En Progreso → Completado
- **Crear tarjeta**: título, descripción, prioridad, categoría, fecha límite
- **Delegar**: asignar tarjeta a un gerente de sucursal
- **Filtros**: por prioridad, categoría, delegado
- **Reordenar** tarjetas dentro de una columna
- **Columnas personalizables**: agregar/renombrar/eliminar columnas
- **Colores de prioridad**: urgente=rojo, alta=naranja, media=azul, baja=gris

### Detalles técnicos
- Drag & drop con `@dnd-kit/core` + `@dnd-kit/sortable` (ya usado en el proyecto para `HorariosDragDrop`)
- Reutiliza el enum `tarea_prioridad` existente y la tabla `tareas_categorias`
- Optimistic updates para mover tarjetas (actualizar columna_id + orden)
- Acceso restringido a `admin_rrhh` via RLS y sidebar roles_permitidos

