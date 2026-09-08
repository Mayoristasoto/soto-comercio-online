/**
 * Base de rutas del módulo de checklist.
 * Permite usar las mismas pantallas dentro del panel completo (/rrhh/checklist)
 * o en el acceso independiente sin menú lateral (/controles).
 */
export const getChecklistBase = (pathname: string) =>
  pathname.startsWith("/controles") ? "/controles" : "/rrhh/checklist";
