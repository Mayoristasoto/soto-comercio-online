## Objetivo

En el calendario del Dashboard (`EventCalendar`) permitir a `admin_rrhh` (y por extensión cualquier usuario logueado) elegir qué capas se ven mediante checkboxes, incluyendo **las categorías nativas actuales** y **los calendarios reales + virtuales** del sistema `/calendarios`. La selección se guarda por usuario en la base de datos.

## Alcance funcional

1. Panel lateral de visibilidad dentro del card del EventCalendar, agrupado en dos secciones:
   - **Capas del dashboard** (toggles existentes): Cumpleaños, Aniversarios, Tareas, Vacaciones aprobadas, Ausencias médicas, Notas, Horarios excepcionales.
   - **Mis calendarios** (de `/calendarios`):
     - Calendarios reales visibles para el usuario (`fetchCalendariosVisibles`).
     - Capas virtuales (`VIRTUAL_CALENDARS`: cumpleaños, vacaciones aprobadas/pendientes, deadlines, tablero) — marcadas como "ya incluidas" si el usuario activó la equivalente del dashboard, para evitar duplicados visuales.
2. Cada toggle muestra el color de la capa (chip) + nombre + ícono.
3. Botón "Mostrar todo / Ocultar todo" por sección.
4. Los puntos de colores en los días del calendario y la lista de eventos del día reflejan únicamente las capas activas.
5. Persistencia por usuario:
   - Capas dashboard: nueva tabla `dashboard_calendar_prefs` (1 fila por usuario, JSON con flags por capa).
   - Calendarios reales/virtuales de `/calendarios`: reutilizar la tabla existente `calendarios_preferencias` (misma usada por `CalendarioSidebar`), para que la elección sea consistente entre el dashboard y la página `/calendarios`.
6. Al primer ingreso: todas las capas dashboard ON; calendarios reales/virtuales toman el default del servicio (visible por defecto).

## Cambios técnicos

### Base de datos (migration)

Tabla `dashboard_calendar_prefs`:
- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL UNIQUE` (referencia lógica a `auth.users`)
- `prefs jsonb NOT NULL default '{}'::jsonb` — claves: `cumpleanos`, `aniversarios`, `tareas`, `vacaciones`, `ausencias`, `notas`, `horarios_excepcionales`, además `external_calendars` (array de `calendario_id` reales del módulo `/calendarios` que el usuario quiere ver mezclados en el dashboard).
- `created_at`, `updated_at` con trigger `update_updated_at_column` ya existente.
- RLS habilitada:
  - SELECT/INSERT/UPDATE/DELETE: solo cuando `auth.uid() = user_id`.
- Índice único en `user_id`.

No se modifica `calendarios_preferencias` (ya existe y la reutilizamos para visibilidad de calendarios reales/virtuales).

### Frontend

`src/components/dashboard/EventCalendar.tsx`:
- Nuevo estado `layerPrefs` (objeto con flags por capa dashboard) y `externalCalendars` (Set de IDs de calendarios reales + virtuales).
- Al montar: cargar `dashboard_calendar_prefs` por `auth.uid()`. Si no existe, insertar fila con defaults.
- Cargar listado de calendarios reales (`fetchCalendariosVisibles`) y virtuales (`VIRTUAL_CALENDARS`) para renderizar el panel.
- Envolver cada bloque de `loadEvents` con un `if (layerPrefs.X)` para no consultar/no pushear esa capa.
- Para calendarios reales activos, llamar `fetchEventosRango` filtrando por los IDs activos y mapear a `CalendarEvent` (nuevo tipo `'externo'` con color del calendario) — usar el `color` del calendario para el dot y para la fila de detalle.
- Para virtuales activos desde `/calendarios`, evitar duplicar con los nativos: si el usuario ya tiene la capa nativa equivalente ON (ej. `cumpleanos`), no agregar también la virtual.
- UI: Sheet/Popover con `Checkbox` por capa, accesible con un botón "Capas" en el header del card. Mobile-friendly.
- Persistir cambios con debounce (300 ms): `upsert` sobre `dashboard_calendar_prefs` y `setPreferencia()` para calendarios reales/virtuales.
- Todos los colores usan tokens del design system salvo los hex propios de cada calendario (vienen de la BD).

### Sin cambios en lógica de negocio

No se altera cómo se generan tareas, vacaciones, ausencias ni horarios. Solo se filtra qué se muestra y se agregan eventos extra desde el servicio de calendarios.

## Notas

- La capa "Vacaciones aprobadas" nativa del dashboard y la capa virtual `virtual:vacaciones` de `/calendarios` muestran el mismo dataset. La UI marca explícitamente los virtuales que dupliquen capas nativas activas para que el usuario entienda por qué no aparecen dos veces.
- El toggle no esconde el calendario; solo afecta puntos y lista de eventos. Crear notas/horarios excepcionales sigue disponible siempre.
- Aunque la pregunta original era para `admin_rrhh`, el componente lo usan también otros roles (Dashboard, EmpleadoDashboard); la persistencia es por `user_id` y funciona para todos sin gatear por rol.
