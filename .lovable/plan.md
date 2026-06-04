# Plan: Selector unificado de empleados/grupos (UI compacta del viejo + motor del nuevo)

## Objetivo
Dejar **un único componente** para seleccionar empleados en toda la app, con la **UI compacta** del actual `ListasEmpleadosManager` (dropdown "Lista guardada" + 3 iconitos), pero usando por debajo `grupos_empleados` (compartidos, con módulos sugeridos, colores, y selección flexible).

## Fase 1 — Migración de datos
- Migración SQL que copia `liquidacion_listas_empleados` → `grupos_empleados`:
  - `tipo='manual'`, `modulos_sugeridos=['nomina']`, `compartido=true`, conserva `nombre`, `empleado_ids`, `created_by`.
  - Evitar duplicados por nombre (usar `ON CONFLICT DO NOTHING` o WHERE NOT EXISTS).
- **No** se borra la tabla vieja en esta fase (solo se deja de usar). Se elimina en una fase posterior tras verificar.

## Fase 2 — Componente nuevo `SelectorGrupoCompacto`
Crear `src/components/empleados/SelectorGrupoCompacto.tsx` con la **misma UI** de la captura:

```text
[ Lista guardada ▼ ]  [👥]  [💾]  [🗑️]
[Badge: N empleados]
```

- Dropdown lista grupos de `grupos_empleados` (filtra/ordena por `modulo` si se pasa). Opción "Todos los empleados" + "— Ninguna —".
- `👥` → abre dialog de selección múltiple con buscador (igual al viejo).
- `💾` → abre dialog "Guardar como grupo" (nombre + módulo sugerido auto).
- `🗑️` → elimina grupo seleccionado (solo si el usuario es el creador o admin).
- Props: `value: SeleccionEmpleados | null`, `onChange`, `modulo?`, `label?`.
- Internamente reutiliza `gruposEmpleados.ts` (`listarGrupos`, `resolverGrupo`, `guardarGrupo`, `eliminarGrupo`).

## Fase 3 — Reemplazo en módulos existentes
Sustituir el selector actual por `SelectorGrupoCompacto`:
1. `src/pages/InformeAsistenciaGerencial.tsx` (saca `ListasEmpleadosManager`)
2. `src/pages/NovedadesLiquidacion.tsx` (saca `ListasEmpleadosManager`)
3. `src/pages/ReporteLlegadasTardeGerentes.tsx` (saca `SelectorEmpleadosOGrupo` actual, queda compacto)

## Fase 4 — Propagación al resto de secciones
Agregar el selector en módulos que hoy filtran "todos vs un empleado":
- **Nómina** (`/rrhh/nomina`)
- **Vacaciones** → calendario y aprobaciones (filtrar por grupo de empleados)
- **Tareas** (`/rrhh/tareas`) → filtrar dashboard por grupo
- **Anotaciones** (`/rrhh/anotaciones`) → filtrar historial
- **Entregas** (`EntregasEmpleados.tsx`)
- **Evaluaciones** → vista admin
- **Informe Ejecutivo**
- **Fichero / Reportes Horarios**

En cada pantalla: agregar `useState<SeleccionEmpleados | null>`, pasar al filtro existente vía `getEmpleadosDeSeleccion`.

## Fase 5 — Limpieza
- Marcar `ListasEmpleadosManager` como deprecated (comentario + redirect interno al nuevo).
- Una vez verificado en producción, borrar tabla `liquidacion_listas_empleados` y el componente viejo (en migración aparte).

## Detalles técnicos
- El motor (`grupos_empleados`, RPC `resolver_grupo_empleados`, `gruposEmpleados.ts`) **ya existe**, no se crea nada nuevo a nivel datos salvo la migración de copia.
- El `SelectorEmpleadosOGrupo` (con tabs Individual/Grupo/Múltiple) se conserva para casos avanzados pero NO es el default; el default pasa a ser el compacto.
- `SeleccionEmpleados` (tipo unión) sigue siendo el contrato común.

## Entregables por fase
- **Fase 1+2+3** → 1 PR/migración. Resultado visible: los 3 informes ya unificados.
- **Fase 4** → iteraciones cortas, módulo por módulo.
- **Fase 5** → cleanup final.

## Qué hacer ahora
Empezar por **Fase 1 + 2 + 3** (migración + componente nuevo + reemplazo en los 3 informes existentes). Las demás secciones (Fase 4) las retomamos después una por una.
