/**
 * Catálogo de secciones disponibles para el panel personalizado
 * (usado en /panel y en /controles).
 * Cada usuario elige cuáles ver y en qué orden.
 */
export interface SeccionControles {
  clave: string;
  titulo: string;
  descripcion: string;
  /** Ruta relativa a la base del panel (ej: "checklist") */
  path: string;
  icon: string;
}

export const CATALOGO_CONTROLES: SeccionControles[] = [
  {
    clave: "checklist",
    titulo: "Checklist de control",
    descripcion: "Realizar y revisar controles de sucursal",
    path: "checklist",
    icon: "ClipboardCheck",
  },
  {
    clave: "plantillas",
    titulo: "Plantillas de control",
    descripcion: "Crear y editar las listas de ítems a controlar",
    path: "checklist/plantillas",
    icon: "ListChecks",
  },
  {
    clave: "performance",
    titulo: "Métricas de atención",
    descripcion: "Performance individual y cruce con fichajes",
    path: "performance",
    icon: "Activity",
  },
  {
    clave: "insumos",
    titulo: "Control de insumos",
    descripcion: "Carga y seguimiento de insumos por sucursal",
    path: "insumos",
    icon: "Package",
  },
  {
    clave: "incidencias",
    titulo: "Incidencias",
    descripcion: "Listado de incidencias de fichaje",
    path: "incidencias",
    icon: "AlertTriangle",
  },
  {
    clave: "resumen-mes",
    titulo: "Resumen del mes",
    descripcion: "Ausencias, feriados, domingos y horas extras",
    path: "resumen-mes",
    icon: "CalendarRange",
  },
  {
    clave: "vacaciones",
    titulo: "Vacaciones",
    descripcion: "Solicitudes, saldos y calendario de vacaciones",
    path: "vacaciones",
    icon: "Palmtree",
  },
  {
    clave: "planificacion",
    titulo: "Planificación semanal",
    descripcion: "Armar y revisar la planificación de la semana",
    path: "planificacion-semanal",
    icon: "Calendar",
  },
  {
    clave: "anotaciones",
    titulo: "Anotaciones",
    descripcion: "Registro de anotaciones de empleados",
    path: "anotaciones",
    icon: "FileText",
  },
  {
    clave: "tablero",
    titulo: "Tablero de proyectos",
    descripcion: "Tarjetas y tareas delegadas",
    path: "tablero",
    icon: "LayoutDashboard",
  },
  {
    clave: "entregas",
    titulo: "Entregas a empleados",
    descripcion: "Seguimiento de elementos entregados",
    path: "entregas",
    icon: "Boxes",
  },
];

export const CONTROLES_DEFAULT = ["checklist", "plantillas"];

/** Base del panel según la ruta actual: /panel o /controles */
export const getPanelBase = (pathname: string) =>
  pathname.startsWith("/controles") ? "/controles" : "/panel";
