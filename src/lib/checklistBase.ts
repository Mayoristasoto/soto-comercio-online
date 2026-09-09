/**
 * Base de rutas del módulo de checklist.
 * Permite usar las mismas pantallas dentro del panel completo (/rrhh/checklist)
 * o en el acceso independiente sin menú lateral (/controles/checklist).
 */
export const getChecklistBase = (pathname: string) =>
  pathname.startsWith("/controles") ? "/controles/checklist" : "/rrhh/checklist";
