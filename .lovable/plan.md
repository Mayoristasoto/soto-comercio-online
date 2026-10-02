# Perfiles de vista personales

## Qué pasa hoy

Tu vista (menú, capas del calendario, vista 1/vista 2, tema) es una sola: si la cambiás para una
tarea, perdés cómo estaba antes. No hay forma de guardar una disposición y volver a ella.

## Qué vamos a hacer

Perfiles de vista con nombre, propios de tu usuario, que guardan toda la disposición actual y
te dejan cambiar de perfil con un clic:

- **Guardar perfil**: botón "Guardar vista actual como perfil" — captura todo lo que tenés
  configurado en ese momento:
  - Capas del calendario del dashboard (qué calendarios se ven).
  - Vista de navegación (vista 1 / vista 2).
  - Tema y preferencias visuales.
  - Accesos rápidos.
  - Visibilidad y orden del menú lateral (snapshot personal de las secciones visibles para tu
    rol, sin tocar la configuración global de `app_pages`).
- **Cambiar de perfil**: selector en el encabezado (junto al selector "Ver como") y en
  Mi Configuración. Al elegir uno, se aplica todo al instante.
- **Perfil por defecto**: marcás uno como predeterminado y se aplica solo al iniciar sesión.
- **Backups**: podés duplicar un perfil, renombrarlo y borrarlo. Los perfiles que no uses quedan
  guardados como respaldo.
- **Actualizar perfil**: si ajustaste la vista y querés que el perfil refleje eso, "Guardar
  cambios en este perfil" lo pisa con el estado actual.
- Todo es por usuario: cada persona puede tener sus propios perfiles, no afecta a nadie más.

## Detalle técnico

- Nueva tabla `perfiles_vista_usuario`: `id`, `user_id`, `nombre`, `es_default` (bool, único por
  usuario vía índice parcial), `config` (jsonb con capas de calendario, vista navegación, tema,
  accesos rápidos y snapshot de menú), `created_at`, `updated_at`. RLS: cada usuario solo ve y
  edita los suyos (`auth.uid() = user_id`). Grants a `authenticated` y `service_role`.
- Nuevo hook `usePerfilesVista`: carga perfiles del usuario, `aplicarPerfil(id)` (escribe las
  preferencias en las tablas/storage actuales: `dashboard_calendar_prefs`, `user_theme_preferences`,
  localStorage de vista y accesos rápidos, y guarda el snapshot de menú en la propia tabla),
  `guardarComoPerfil(nombre)`, `actualizarPerfil(id)`, `setDefault(id)`, `duplicar`, `renombrar`,
  `borrar`.
- Snapshot de menú: array de paths visibles/ocultos por el usuario; `useSidebarLinks` lo respeta
  cuando hay un perfil activo con snapshot (filtra sin modificar `app_pages`).
- UI: `SelectorPerfilVista` en el header (dropdown con lista, "Guardar actual...", marcar
  predeterminado) y sección "Mis perfiles de vista" en `ConfiguracionUsuario.tsx` con la gestión
  completa (renombrar, duplicar, borrar, default).
- Al iniciar sesión, si hay perfil default y no hay uno activo en la sesión, se aplica.
- Sin cambios en RLS de otras tablas ni en la configuración global de accesos por rol.
