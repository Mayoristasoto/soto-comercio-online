/**
 * Base de rutas del módulo de checklist.
 * Permite usar las mismas pantallas dentro del panel completo (/rrhh/checklist),
 * en el panel personalizado (/panel/checklist) o en el acceso a controles (/controles/checklist).
 */
export const getChecklistBase = (pathname: string) => {
  if (pathname.startsWith("/controles")) return "/controles/checklist";
  if (pathname.startsWith("/panel")) return "/panel/checklist";
  return "/rrhh/checklist";
};
