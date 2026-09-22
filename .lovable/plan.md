# Reorganización del sistema

Hoy el sistema tiene 64 secciones de menú que crecieron por agregado, con nombres repetidos, grupos incompletos y pantallas que no respetan el "Ver como". La idea es dejar una sola estructura clara, igual para todos los roles, y que lo que ves simulando un rol sea exactamente lo que esa persona ve.

## 1. Nueva estructura del menú (7 grupos)

Todo acceso queda dentro de uno de estos grupos, sin secciones sueltas en la raíz:

1. **Inicio** — Panel principal, Mi perfil, Mis solicitudes.
2. **Asistencia** — Fichero (informe, estadísticas, estado de ánimo), Justificaciones, Horas trabajadas, Horas extras, Kioscos.
3. **Personal** — Empleados, Anotaciones, Onboarding, Documentos obligatorios, Entregas, Capacitaciones, Evaluaciones.
4. **Vacaciones y licencias** — Vacaciones, Plan de cobertura, Certificados médicos, Feriados y días especiales.
5. **Operaciones** — Tareas, Tablero, Planificación semanal, Limpieza, Control de insumos, Checklist de control, Recorrido de salón, Góndolas.
6. **Liquidación y costos** — Liquidaciones, Recibos, Cargas sociales, Rentabilidad, Presupuesto.
7. **Reclutamiento** — Puestos, Candidatos, Agenda de entrevistas.

**Administración** queda fuera del menú principal, dentro de Configuración (ya reorganizada en Asistencia / RRHH / Accesos y roles / Sistema).

## 2. Accesos por rol coherentes

Se define un juego base de accesos por rol y se aplica desde la Matriz:

- **Empleado**: Inicio, su fichero, sus vacaciones/solicitudes, sus tareas, capacitaciones.
- **Líder de grupo**: lo del empleado + tareas del grupo, planificación (lectura), limpieza.
- **Gerente de sucursal**: lo del líder + aprobaciones y cobertura de su sucursal, insumos, checklist, recorrido, planificación de su sucursal.
- **Admin RRHH**: todo.

Se revisan las inconsistencias detectadas: grupos habilitados sin hijos visibles, hijos habilitados sin su grupo, y el rol viejo `admin` que aparece en algunos accesos (ej. Instructivo Delegación) y ya no existe.

## 3. Que "Ver como" sea real

Unas 35 pantallas consultan el rol directo de la base y por eso ignoran la simulación. Se reemplaza esa consulta por un único punto de verdad, para que al elegir "Ver como Gerente" veas las mismas pestañas y botones que un gerente. Los datos siguen siendo los que tu cuenta puede leer (la seguridad de la base no cambia).

## 4. Limpieza

- Quitar la lista de menú vieja (78 filas sin uso) y su editor antiguo, que hoy solo genera confusión.
- Unificar nombres duplicados (varias "Anotaciones", "Fichero" repetido en dos grupos) y rutas con `#pestaña` que aparecen como secciones propias.
- Dejar los enlaces antiguos funcionando por compatibilidad.

## Detalle técnico

- Migración de datos sobre `app_pages`: reasignar `parent_id`/`orden` a los 7 grupos, normalizar `roles_permitidos` (eliminar el valor `admin`), resolver duplicados y marcar como no visibles los links `#tab` que no deben figurar como sección.
- Nuevo hook `useRolEfectivo` (envuelve `RolePreviewContext` con fallback a `current_user_role`) y reemplazo de las llamadas directas a `current_user_role` / consultas a `user_roles` en las páginas afectadas, en tandas por módulo (asistencia, vacaciones, operaciones, liquidación).
- Borrado de `sidebar_links` y del componente editor que la consume.
- Preset de accesos por rol expuesto como acción "Aplicar juego base" en la Matriz, con confirmación.
- Sin cambios de RLS ni de esquema fuera de `app_pages`.

## Orden de trabajo

1. Migración de estructura y limpieza de `app_pages`.
2. Juego base de accesos por rol + revisión en la Matriz.
3. `useRolEfectivo` y migración de pantallas por módulo.
4. Eliminación de `sidebar_links` y el editor viejo.
