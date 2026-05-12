## Objetivo

Implementar un módulo de **Calendarios** estilo Google Calendar dentro de la app, accesible para `admin_rrhh`. Cada admin puede crear múltiples calendarios personalizados (con color y descripción), compartirlos con otros usuarios (lectura o edición), y en la vista principal activar/desactivar capas con checkboxes para superponer todo: eventos propios, compartidos, cumpleaños de empleados, vacaciones aprobadas y deadlines de tareas.

## Ubicación y navegación

- Nueva página `src/pages/Calendarios.tsx` con ruta `/rrhh/calendarios`.
- Entrada en `AppSidebar` bajo el grupo RRHH (visible solo para `admin_rrhh`, gestionado por `app_pages`).
- Widget compacto en `Dashboard` que muestre los próximos 5 eventos del usuario (calendarios activos).

## Modelo de datos (nuevas tablas)

```text
calendarios
  id, owner_id (empleados.id), nombre, descripcion, color (hex),
  icono, es_publico (bool), activo, created_at, updated_at

calendario_compartidos
  id, calendario_id, empleado_id, permiso ('view' | 'edit'),
  created_at  -- unique(calendario_id, empleado_id)

calendario_eventos
  id, calendario_id, titulo, descripcion, ubicacion,
  fecha_inicio (timestamptz), fecha_fin (timestamptz),
  todo_el_dia (bool), color (override opcional),
  tipo ('evento' | 'deadline' | 'recordatorio' | 'reunion'),
  estado ('pendiente' | 'completado' | 'cancelado'),
  recurrencia (jsonb null: {freq, interval, until, byday}),
  creado_por, created_at, updated_at

calendario_evento_invitados   -- opcional fase 2
  id, evento_id, empleado_id, estado ('pendiente'|'aceptado'|'rechazado')

calendario_preferencias_usuario
  id, empleado_id, calendario_id, visible (bool), orden int
  -- guarda qué capas tiene activas cada usuario
```

**RLS**:
- `calendarios`: SELECT si `owner_id = current_empleado()` o existe fila en `calendario_compartidos` o `es_publico=true` o `has_role(auth.uid(),'admin_rrhh')`. INSERT/UPDATE/DELETE solo owner o admin_rrhh.
- `calendario_compartidos`: gestionado por owner del calendario (función `is_calendario_owner(_cal_id, _user)` SECURITY DEFINER para evitar recursión).
- `calendario_eventos`: SELECT si el usuario puede ver el calendario padre. INSERT/UPDATE/DELETE si owner o `permiso='edit'` en compartidos.
- `calendario_preferencias_usuario`: solo el propio usuario.

Migrar `calendario_notas` existente: dejarlo como está (legacy) y opcionalmente exponer una vista `eventos_legacy` para mostrarlos como un calendario "Notas históricas".

## Fuentes virtuales (capas auto-generadas, no son tablas)

Se exponen como pseudocalendarios fijos que el usuario puede activar:

1. **Cumpleaños** — derivado de `empleados.fecha_nacimiento` (color rosa, todo el día, recurrente anual).
2. **Vacaciones aprobadas** — derivado de `vacaciones` con estado `aprobada` (color verde, rangos).
3. **Deadlines de tareas** — derivado de `tareas.fecha_limite` para tareas asignadas al usuario o de su área (color rojo).
4. **Feriados** — derivado de la tabla existente `dias_especiales` / feriados (color gris).

Cada uno tiene un id sintético (`virtual:cumpleanos`, etc.), aparece en el sidebar de calendarios con su checkbox y se mergea con los eventos reales en el render.

## UI

Layout tipo Google Calendar:

```text
+------------------------------------------------------------+
| Header:  [Hoy] [<] [>]   Mayo 2026         [Mes|Sem|Día|Agenda]  [+ Evento] |
+----------------+-------------------------------------------+
| Mini calendar  |                                           |
|                |        Vista principal (mes/semana/día)   |
| Mis calendarios|                                           |
|  [x] Personal  |                                           |
|  [x] Equipo RH |                                           |
| Compartidos    |                                           |
|  [x] Gerencia  |                                           |
| Otros          |                                           |
|  [x] Cumpleaños|                                           |
|  [x] Vacaciones|                                           |
|  [ ] Deadlines |                                           |
|                |                                           |
| [+ Crear cal.] |                                           |
+----------------+-------------------------------------------+
```

Componentes nuevos en `src/components/calendarios/`:
- `CalendariosLayout.tsx` — shell con sidebar + vista principal.
- `CalendarioSidebar.tsx` — listas (Mis / Compartidos / Virtuales) con checkboxes, color dot, menú contextual (compartir, editar, eliminar).
- `VistaMes.tsx`, `VistaSemana.tsx`, `VistaDia.tsx`, `VistaAgenda.tsx`.
- `EventoDialog.tsx` — crear/editar evento (calendario destino, fechas, todo el día, recurrencia simple, tipo, descripción).
- `CalendarioDialog.tsx` — crear/editar calendario (nombre, color, descripción, icono).
- `CompartirCalendarioDialog.tsx` — buscador de empleados + selector de permiso, lista de actuales con quitar.
- `MiniCalendar.tsx` — navegación rápida.
- `EventoPopover.tsx` — preview al click sobre un evento (con acciones editar / completar / eliminar).

Reglas visuales:
- Colores corporativos como defaults sugeridos al crear (Primary `#4b0d6d`, Secondary `#95198d`, Accent `#e04403`) + paleta extendida.
- Eventos pintados con el color del calendario (o override del evento).
- Deadlines vencidos con borde punteado rojo y tachado si `estado='completado'`.
- Cumpleaños con icono de torta, vacaciones con icono palmera, feriados con bandera.

## Lógica clave

- Hook `useCalendarios()` — lista calendarios visibles + preferencias del usuario (visible/orden).
- Hook `useEventosRango(desde, hasta, calendariosActivos)` — fetch en paralelo de:
  - `calendario_eventos` filtrados por `calendario_id IN activos` y rango.
  - Fuentes virtuales activas (cumpleaños, vacaciones, tareas, feriados).
  - Merge + ordenamiento por fecha.
- Persistencia de capas activas en `calendario_preferencias_usuario` (no en localStorage) para sincronizar entre dispositivos.
- Zona horaria Argentina (UTC-3) usando `src/lib/dateUtils.ts` para todos los renders y queries.
- Recurrencia fase 1: solo "anual" (cumpleaños) calculada en cliente. RRULE completo queda para fase 2.

## Compartir

- Dialog con `Command` de shadcn para buscar empleados por nombre/dni.
- Permisos: **Ver** (default) o **Editar**.
- Notificación opcional vía `whatsapp-notify` o tabla `notificaciones` cuando se comparte un calendario nuevo.

## Permisos / acceso

- Solo `admin_rrhh` puede crear calendarios y compartir (gate en UI + RLS).
- Cualquier empleado puede **ver** calendarios donde fue invitado (fase 2: abrir a más roles si el usuario lo pide).
- Edge case: al borrar un empleado, `ON DELETE CASCADE` en `calendario_compartidos` y `SET NULL` en `creado_por`.

## Integración con dashboard

- Nuevo widget `ProximosEventosWidget` en `src/pages/Dashboard.tsx` (solo admin_rrhh por ahora): top 5 eventos próximos de las capas que el usuario tiene activas, con link a `/rrhh/calendarios`.
- Reemplazar/complementar el `EventCalendar.tsx` actual con datos del nuevo modelo (mantener compatibilidad leyendo también `calendario_notas`).

## Fases de entrega

1. **Migración DB** + RLS + funciones helper (`is_calendario_owner`, `can_edit_calendario`).
2. **Backend hooks + tipos** + seeding de un calendario "Personal" automático para cada admin_rrhh existente.
3. **UI base**: layout, sidebar de calendarios, vista mes con eventos reales + checkboxes.
4. **CRUD eventos** + dialog crear/editar + popover.
5. **Compartir calendarios** + permisos edit/view.
6. **Capas virtuales**: cumpleaños, vacaciones, deadlines de tareas, feriados.
7. **Vistas extra**: semana, día, agenda + mini calendar.
8. **Widget dashboard** + entrada en sidebar + ruta protegida.

## Archivos

**Nuevos**
- `src/pages/Calendarios.tsx`
- `src/components/calendarios/CalendariosLayout.tsx`
- `src/components/calendarios/CalendarioSidebar.tsx`
- `src/components/calendarios/VistaMes.tsx`, `VistaSemana.tsx`, `VistaDia.tsx`, `VistaAgenda.tsx`
- `src/components/calendarios/MiniCalendar.tsx`
- `src/components/calendarios/EventoDialog.tsx`
- `src/components/calendarios/EventoPopover.tsx`
- `src/components/calendarios/CalendarioDialog.tsx`
- `src/components/calendarios/CompartirCalendarioDialog.tsx`
- `src/components/dashboard/ProximosEventosWidget.tsx`
- `src/hooks/useCalendarios.ts`, `src/hooks/useEventosRango.ts`
- `src/lib/calendariosService.ts` (queries + merge de fuentes virtuales)

**Modificados**
- `src/App.tsx` (ruta nueva)
- `src/components/AppSidebar.tsx` (entrada nueva)
- `src/pages/Dashboard.tsx` (widget)
- Tabla `app_pages` (registrar la nueva página)

## Consideraciones técnicas

- Sin librerías nuevas pesadas: usar `date-fns` + `react-day-picker` ya presentes; layout custom con tailwind grid (no `react-big-calendar`/`fullcalendar` salvo que el usuario lo pida).
- Realtime opcional con `supabase.channel` sobre `calendario_eventos` para actualizar la vista en vivo.
- Performance: query por rango visible, índice `(calendario_id, fecha_inicio)` y `(fecha_inicio)`.
- Accesibilidad: navegación con teclado en grid de mes (flechas), `aria-label` en eventos.
