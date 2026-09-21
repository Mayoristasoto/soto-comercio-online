# Barra de vistas siempre disponible

## Qué pasa hoy

Al elegir "Ver como Gerente de sucursal" la app te lleva al panel del encargado, que es una pantalla
sin menú ni encabezado. Como el selector vive en el encabezado, desaparece y quedás atrapado en esa
vista: no podés saltar a otra vista ni volver a la tuya sin recargar.

## Qué vamos a hacer

Tu rol real (Admin RRHH) queda fijo y el selector pasa a estar siempre visible, en cualquier
pantalla:

- Una barra flotante fija, arriba a la derecha, presente en toda la app mientras tu cuenta sea
  Admin RRHH: muestra la vista activa y permite cambiar a cualquier otra vista o volver a la tuya
  en un clic.
- Mientras estás simulando, la barra se ve resaltada con el texto "Viendo como …" y un botón
  "Volver a mi vista".
- En pantallas sin menú (como el panel del encargado) esa barra es el único control agregado, así
  la vista sigue siendo fiel a lo que ve un gerente.
- En el encabezado normal se mantiene el mismo selector, sin duplicar la barra flotante.
- La vista elegida se recuerda mientras navegás y se descarta al cerrar sesión.

Sigue siendo una simulación de pantallas y accesos: los datos son los que tu cuenta puede ver.

## Detalle técnico

- `RolePreviewContext.tsx`: resolver `rolReal` dentro del propio provider llamando a la RPC
  `current_user_role` al montar (con el `setRolReal` actual como override opcional), para que el
  contexto funcione también en rutas fuera de `UnifiedLayout`.
- Nuevo `src/components/admin/RoleViewFloatingBar.tsx`: barra `fixed` (z alto, respetando safe-area
  en mobile) que renderiza `RoleViewSwitcher` + botón "Volver a mi vista"; devuelve `null` si
  `rolReal !== 'admin_rrhh'`.
- `App.tsx`: renderizar `RoleViewFloatingBar` una sola vez dentro de `RolePreviewProvider`, dentro
  del `BrowserRouter` (necesita `useNavigate`), fuera de `Routes`.
- `UnifiedLayout.tsx`: quitar el botón "Volver a mi vista" que se agregó en la rama de gerente
  (ahora lo cubre la barra flotante) y mantener el `RoleViewSwitcher` del encabezado; ocultar la
  barra flotante cuando el encabezado ya está visible mediante una bandera en el contexto
  (`headerSwitcherMontado`) para no mostrar dos controles.
- Sin cambios de base de datos ni de RLS.
