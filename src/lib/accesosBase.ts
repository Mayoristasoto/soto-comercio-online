// Juego base de accesos por rol, definido por path de `app_pages`.
// Admin RRHH siempre tiene todo, por eso no se enumera.

const EMPLEADO = [
  "/dashboard",
  "/autogestion",
  "#asistencia",
  "/operaciones/fichero",
  "/operaciones/fichero#misfichadas",
  "/operaciones/fichero#estado-animo",
  "#vacaciones-licencias",
  "/vacaciones",
  "/solicitudes",
  "#operaciones",
  "/tareas",
  "/instructivo/delegacion-tareas",
  "#personal",
  "/evaluaciones",
]

const LIDER = [
  ...EMPLEADO,
  "/operaciones/fichero#estadisticas",
  "/operaciones/novedades-alertas",
  "/rrhh/grupos-empleados",
]

const GERENTE = [
  ...LIDER,
  "/operaciones/fichero#incidencias",
  "/operaciones/fichero#horarios",
  "/rrhh/indice-ausentismo",
  "/rrhh/informe-asistencia-gerencial",
  "/operaciones/confirmacion-staff",
  "/rrhh/checklist",
  "/rrhh/recorrido",
  "/rrhh/encuestas",
  "/anotaciones3",
  "/tablero-proyectos",
  "#reconocimiento",
  "/desafios",
  "/premios",
  "/ranking",
  "/insignias",
  "#comercial",
  "/gondolas",
  "/gondolas-edit",
  "/comercio",
]

export const ACCESOS_BASE: Record<string, string[] | "todo"> = {
  empleado: EMPLEADO,
  lider_grupo: LIDER,
  gerente_sucursal: GERENTE,
  admin_rrhh: "todo",
}

export function rolTieneAccesoBase(rol: string, path: string): boolean {
  const base = ACCESOS_BASE[rol]
  if (!base) return false
  if (base === "todo") return true
  return base.includes(path)
}
