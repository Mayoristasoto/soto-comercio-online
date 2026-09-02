# Vista 2: Centro de accesos para admin_rrhh

Nueva vista alternativa que muestra **todas las secciones agrupadas por módulo** (como el mapa que generamos), seleccionable desde la configuración del perfil.

## Qué se construye

### 1. Nueva página "Centro de accesos" (`/centro-accesos`)
- Grilla de tarjetas, una por módulo: **RRHH**, **Operaciones**, **Administración**, **Finanzas y Proyectos**, **Reconocimiento**, **Kiosco y Autogestión**, **Mi cuenta**.
- Dentro de cada tarjeta, la lista de secciones con su icono, nombre y descripción corta; cada una navega a su ruta.
- Buscador arriba que filtra por nombre de sección en todos los grupos.
- Contador de secciones por grupo y estado vacío cuando el filtro no encuentra nada.
- Responsive: 1 columna en celular, 2 en tablet, 3 en escritorio.
- Solo accesible para `admin_rrhh` (si otro rol entra, redirige a `/dashboard`).

### 2. Selector de vista en "Mi Configuración"
- Nueva tarjeta **"Vista de navegación"**, visible solo para `admin_rrhh`, con dos opciones:
  - **Vista 1 (actual)** — dashboard + menú lateral como hoy.
  - **Vista 2 (Centro de accesos)** — al iniciar sesión y al hacer clic en el logo/inicio se abre el Centro de accesos con todas las secciones agrupadas.
- La preferencia se guarda por usuario y se recuerda entre sesiones.

### 3. Comportamiento del cambio de vista
- Con Vista 2 activa, `/dashboard` redirige al Centro de accesos y el menú lateral sigue disponible (no se pierde nada).
- Con Vista 1 activa, todo queda exactamente igual que hoy; `/centro-accesos` sigue accesible manualmente.

## Detalles técnicos

- Fuente de datos: tabla `app_pages` filtrada por `visible = true` y `roles_permitidos` conteniendo `admin_rrhh`, reutilizando el hook existente `useSidebarLinks` (que ya arma la jerarquía padre/hijo) para no duplicar lógica ni mantener listas hardcodeadas. Se agrega un pequeño bloque estático solo para las rutas fuera de `app_pages` (kiosco, autogestión, instructivos, temas).
- Nuevo hook `useVistaNavegacion` con persistencia en `localStorage` por `userId`, siguiendo el mismo patrón de `useAccesosRapidos` (sin migración de base de datos).
- Archivos nuevos: `src/pages/CentroAccesos.tsx`, `src/components/navegacion/GrupoAccesosCard.tsx`, `src/hooks/useVistaNavegacion.ts`.
- Archivos modificados: `src/App.tsx` (ruta dentro de `UnifiedLayout`), `src/pages/ConfiguracionUsuario.tsx` (tarjeta selectora), `src/pages/Dashboard.tsx` (redirección condicional).
- Iconos resueltos dinámicamente desde `lucide-react` igual que en `UnifiedSidebar`, con fallback.
- Colores desde tokens semánticos existentes; sin utilidades de color hardcodeadas.
