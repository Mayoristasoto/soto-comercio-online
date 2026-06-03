
## Grupos de Empleados Reutilizables

Crear un sistema centralizado de **grupos de empleados** editables que pueda usarse como filtro en cualquier módulo (RRHH, Fichero, Nómina, Vacaciones, Informes, Tareas, etc.) permitiendo elegir entre empleado individual o grupo preguardado.

Ya existe `liquidacion_listas_empleados` (usado en novedades de liquidación), pero está acoplado a un solo módulo. La propuesta es **generalizarlo** a `grupos_empleados` y reemplazar usos puntuales para que todo el sistema comparta los mismos grupos.

### 1. Base de datos

**Tabla `grupos_empleados`**
- `id`, `nombre`, `descripcion`, `color` (para badge visual)
- `tipo`: `manual` (lista fija de IDs) o `dinamico` (filtro por sucursal/puesto/rol)
- `empleado_ids` (jsonb array) — usado si tipo=manual
- `filtros` (jsonb) — usado si tipo=dinamico: `{ sucursal_ids, puesto_ids, roles, activo, antiguedad_min }`
- `compartido` (bool) — visible para todos los admin_rrhh, o solo el creador
- `modulos_sugeridos` (text[]) — tags como `["fichero","nomina","vacaciones"]` para autocompletar en cada módulo
- `created_by`, `created_at`, `updated_at`

**RLS:** lectura para `admin_rrhh`, `gerente_sucursal`, `gerente_general`; escritura para creador o `admin_rrhh`. GRANTs estándar.

**Migración de datos:** copiar registros existentes de `liquidacion_listas_empleados` con `tipo='manual'` y `modulos_sugeridos=['nomina']`. Dejar la tabla vieja como deprecada (vista que apunta a la nueva) hasta migrar el código.

### 2. Componente reutilizable `<SelectorEmpleadosOGrupo />`

Ubicación: `src/components/empleados/SelectorEmpleadosOGrupo.tsx`

Props:
```ts
{
  value: { tipo: 'individual' | 'grupo' | 'multiple', empleadoIds: string[], grupoId?: string }
  onChange: (v) => void
  modulo?: string   // filtra grupos sugeridos para ese módulo
  permitirMultiple?: boolean
  permitirGrupos?: boolean
}
```

UI:
- Tabs: **Individual** | **Grupo guardado** | **Selección múltiple**
- Tab Individual: buscador con autocompletar (un solo empleado)
- Tab Grupo: dropdown de grupos guardados (con preview de empleados resueltos + contador), botón "Editar grupo"
- Tab Múltiple: picker tipo checkbox con buscador (reutilizar lógica de `ListasEmpleadosManager`)
- Botón flotante **"Guardar selección como grupo"** que abre dialog para nombrar y compartir

### 3. Página de gestión `src/pages/GruposEmpleados.tsx` → `/rrhh/grupos-empleados`

- CRUD completo de grupos (crear, editar, duplicar, eliminar)
- Editor con tabs Manual / Dinámico
  - Manual: picker de empleados (reusa selector)
  - Dinámico: combos de sucursal/puesto/rol/antigüedad con preview en vivo de cuántos empleados matchean
- Tabla con: nombre, tipo, cantidad de empleados resueltos, módulos sugeridos, creador, acciones
- Filtros por módulo, creador, tipo

### 4. Integración en módulos existentes

Reemplazar pickers ad-hoc por el selector unificado:

| Módulo | Archivo | Uso |
|---|---|---|
| Nómina/Novedades | `NovedadesLiquidacion.tsx` (usa `ListasEmpleadosManager`) | Migrar a nuevo selector |
| Vacaciones | `AprobacionVacaciones.tsx`, `CalendarioVacaciones.tsx` | Filtrar por grupo |
| Fichero | `Fichero.tsx`, balance diario | Ver fichajes de un grupo |
| Informes | `InformeAsistenciaGerencial.tsx`, `ReporteLlegadasTardeGerentes.tsx`, `InformeEjecutivo.tsx` | Generar PDF para grupo |
| Tareas | `CreateTaskDialog.tsx`, `BulkDelegateDialog.tsx` | Asignar tareas a grupo entero |
| Anotaciones | `NuevaAnotacion.tsx` | Anotación masiva a grupo |
| Entregas | `EntregasEmpleados.tsx` | Registrar entrega a grupo |
| Calendarios | `EmpleadosAfectadosPicker.tsx` | Arrobar grupo entero |
| Evaluaciones | `AsignarEvaluacion.tsx` | Asignar a grupo |

Cada módulo recibe el selector pasando su `modulo` para priorizar grupos relevantes. No se rompen flujos actuales: si el usuario elige individual, funciona como antes.

### 5. Helper de resolución

`src/lib/gruposEmpleados.ts`:
- `resolverGrupo(grupoId): Promise<string[]>` — devuelve IDs finales (resuelve filtros dinámicos contra la tabla `empleados`)
- `useGrupoEmpleados(grupoId)` — hook con cache
- `getEmpleadosDeSeleccion(value)` — convierte el value del selector a lista plana de IDs para queries

### 6. Permisos y visibilidad

- `admin_rrhh` y `gerente_general`: ven y editan todos los grupos compartidos
- `gerente_sucursal`: ven grupos compartidos + propios; al crear, sus grupos dinámicos quedan auto-limitados a su sucursal
- Empleado normal: no accede a grupos

### Fuera de alcance
- Grupos anidados (grupo de grupos)
- Sincronización automática con organigrama jerárquico
- Versionado histórico de quién estuvo en el grupo en cada momento (snapshot)
- Migración inmediata de TODOS los módulos: se hace por fases (primero el componente + página, luego se van enchufando módulos uno a uno según prioridad)

### Orden sugerido de implementación
1. Migración DB + datos seed desde `liquidacion_listas_empleados`
2. Helper `resolverGrupo` + tests manuales
3. Componente `SelectorEmpleadosOGrupo`
4. Página `/rrhh/grupos-empleados` + link en sidebar
5. Migrar Nómina/Novedades (reemplazo directo de lo existente)
6. Integrar en Informes (mayor valor inmediato)
7. Resto de módulos por demanda
