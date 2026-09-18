# Selector "Ver como" junto a tu nombre

Al lado del badge "Admin" en la barra superior aparece un desplegable para elegir con qué vista navegar:

- **Vista Admin RRHH** (la real, opción por defecto)
- **Vista Gerente de sucursal**
- **Vista Líder de grupo**
- **Vista Empleado**

Al elegir una vista, la aplicación se recarga como si te hubiera entrado alguien con ese rol: menú lateral con sus accesos, pantalla de inicio que le corresponde y los botones y secciones que ese rol puede usar. Una barra fija arriba avisa "Estás viendo la app como Gerente de sucursal" con un botón "Volver a mi vista".

Solo los usuarios con rol admin_rrhh ven el selector.

## Qué cambia en cada vista

- **Gerente de sucursal**: entra al panel del encargado, sin menú lateral ni dashboard personal, y solo puede abrir las tarjetas habilitadas para encargados. En control de insumos ve el flujo de carga única con "Finalizar control", sin reabrir.
- **Líder de grupo**: menú y accesos configurados para ese rol.
- **Empleado**: vista de autogestión, sin secciones de RRHH ni administración.
- **Volver a Admin**: restaura todo de inmediato.

## Importante sobre permisos

Esto simula la **interfaz**, no los permisos de la base de datos. Seguís conectado con tu propia cuenta de RRHH, así que los datos que se muestran son los que tu cuenta puede leer: por ejemplo, en vista gerente podés ver más sucursales de las que vería un gerente real. Sirve para revisar qué pantallas y botones ve cada rol, no para auditar el acceso a datos.

Si además querés probar los permisos reales, eso requiere entrar con un usuario de prueba de ese rol; lo podemos sumar después como opción "abrir sesión de prueba".

## Detalle técnico

- Nuevo `src/contexts/RolePreviewContext.tsx`: provider con `rolReal`, `rolVista`, `enPreview`, `setRolVista`, persistido en `sessionStorage` (`role_preview_rol`) para que sobreviva recargas y se limpie al cerrar la pestaña. `setRolVista` solo acepta cambios si `rolReal === 'admin_rrhh'`.
- Provider montado dentro de `UnifiedLayout` (envuelve sidebar, header y `<Outlet>`), alimentado con el rol traído en `checkAuth()`.
- `UnifiedLayout`:
  - `rolEfectivo = rolVista ?? userInfo.rol` reemplaza `userInfo.rol` en el badge, en `isGerenteUser` (restricción de rutas del gerente), en `GlobalSearch userRole` y en el contexto del `Outlet` (`userInfo` se pasa con `rol: rolEfectivo`, conservando `rolReal` como campo aparte).
  - Nuevo componente `src/components/admin/RoleViewSwitcher.tsx` (DropdownMenu de shadcn) renderizado junto al badge en las variantes desktop y tablet; visible solo si `rolReal === 'admin_rrhh'`.
  - Banner de aviso arriba del `<main>` cuando `enPreview`, con acción "Volver a mi vista".
- `UnifiedSidebar` ya recibe `userInfo.rol`, con lo cual toma el rol simulado y `useSidebarLinks` consulta `app_pages` con ese rol. En vista gerente el sidebar se oculta igual que hoy.
- `useEsRRHH`: pasa a leer el contexto cuando está disponible (`rolVista`), con fallback a la RPC `current_user_role` para las pantallas que se usan fuera del layout (kiosco, `/controles`). Así los `esRRHH` de páginas como `ControlInsumos` respetan la vista elegida.
- Redirección inicial: al activar una vista se navega a la home de ese rol (`/preview-panel-encargado` para gerente, `/dashboard` para líder/empleado, `/dashboard` para admin) y al volver, a `/dashboard`.
- Sin cambios de base de datos ni de políticas RLS.
