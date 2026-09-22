# Reorganizar Configuración y Accesos por rol

## Qué pasa hoy

La pantalla de Configuración tiene 11 pestañas apretadas en una sola fila y mezcla cosas muy distintas: fichaje, reconocimiento facial, PINs, kioscos, IA, solicitudes, comercial, navegación, plantillas, accesos por rol y vista de roles.

Además hay **tres pantallas distintas que tocan lo mismo** (qué ve cada rol):

- "Navegación": editar páginas (nombre, ruta, orden, ícono, visible, roles).
- "Accesos por rol": interruptores por rol.
- "Vista Roles": previsualización de tarjetas del dashboard.

Y la lista de accesos por rol se muestra plana, sin saber cuántos roles tiene cada sección ni comparar roles entre sí.

## Mapa actual de accesos (verificado en la base)

- 64 secciones cargadas; 63 marcadas para el menú; 9 ocultas.
- 3 son solo encabezados de grupo (RRHH, etc.) y 9 apuntan a una pestaña dentro de otra página (por ejemplo Fichero > Informe).
- Grupos principales: Dashboard, RRHH (Fichero, Nómina, Evaluaciones, Vacaciones, Solicitudes, Anotaciones, Administración, Checklist, Encuestas, Entrevistas), y subniveles de Fichero y Nómina.
- Inconsistencias detectadas: "Índice de Ausentismo" está habilitado **solo para Empleado** (ningún admin lo ve por menú); hay dos "Anotaciones" duplicadas (`/anotaciones3` visible y `/anotaciones2` oculta); tres secciones sueltas conviven con los grupos.
- Queda una tabla vieja `sidebar_links` con 78 filas que el menú ya no usa (solo la lee su editor antiguo): fuente de confusión.

## Plan de mejoras

### 1. Reorganizar Configuración en 4 grupos

Cambiar la fila de 11 pestañas por una navegación lateral con secciones:

- **Asistencia**: Fichero, Reconocimiento facial, PINs, Kioscos
- **RRHH**: Solicitudes, Plantillas de documentos
- **Accesos y roles**: pantalla unificada (ver punto 2)
- **Sistema**: Comercial, Modelos de IA

Se mantienen los enlaces actuales con `?tab=` para no romper accesos directos (incluido el engranaje del menú "Ver como").

### 2. Unificar las tres pantallas de accesos en una sola

Una pantalla "Accesos y roles" con tres solapas internas:

- **Matriz**: tabla con todas las secciones en filas y los 4 roles en columnas; un clic marca/desmarca. Se ve de un golpe quién entra a qué, con contadores por rol y filtro por grupo/texto.
- **Estructura**: el editor de páginas actual (nombre, orden, ícono, agrupación, visible en menú) con árbol arrastrable.
- **Vista previa**: la previsualización de tarjetas por rol que ya existe, más un botón para abrir la app como ese rol.

Acciones útiles en la matriz: "copiar accesos de un rol a otro", habilitar/quitar un grupo completo con sus subsecciones, y aviso cuando una subsección queda habilitada sin su grupo padre.

### 3. Limpieza de datos

- Resolver el duplicado de Anotaciones (dejar una).
- Revisar "Índice de Ausentismo" para que lo vean los roles correctos.
- Marcar el editor viejo de enlaces como obsoleto y dejar una sola fuente de verdad.

## Detalles técnicos

- `src/pages/ConfiguracionAdmin.tsx`: reemplazar `TabsList grid-cols-11` por layout de dos columnas (nav vertical + contenido), agrupando los `TabsContent` existentes sin tocar su lógica interna. Mantener sincronía con `useSearchParams`.
- Nuevo `src/components/admin/AccesosRolesPanel.tsx` que envuelve tres solapas: nueva `MatrizAccesosRol.tsx`, `PagesManager.tsx` (existente) y `RolePreview.tsx` (existente). Se retiran las pestañas "Navegación", "Accesos por rol" y "Vista Roles" del nivel superior.
- `MatrizAccesosRol.tsx`: lee `app_pages` (`id, nombre, path, parent_id, orden, visible, mostrar_en_sidebar, roles_permitidos`), agrupa por `parent_id`, y escribe `roles_permitidos` por celda con actualización optimista. Reutiliza la regla actual de `AccesosPorRolManager` (habilitar padre al habilitar un hijo). `AccesosPorRolManager.tsx` queda reemplazado por esta matriz.
- El menú ya se refresca solo: `useSidebarLinks` está suscrito a cambios en `app_pages`.
- Limpieza de datos con sentencias puntuales sobre `app_pages` (duplicado de anotaciones y roles de índice de ausentismo), previa confirmación.
- Sin cambios de esquema ni de RLS.
