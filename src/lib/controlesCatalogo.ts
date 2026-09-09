/**
 * Catálogo de secciones disponibles para el panel personalizado de /controles.
 * Cada usuario elige cuáles ver y en qué orden.
 */
export interface SeccionControles {
  clave: string;
  titulo: string;
  descripcion: string;
  url: string;
  icon: string;
}

export const CATALOGO_CONTROLES: SeccionControles[] = [
  {
    clave: "checklist",
    titulo: "Checklist de control",
    descripcion: "Realizar y revisar controles de sucursal",
    url: "/controles/checklist",
    icon: "ClipboardCheck",
  },
  {
    clave: "plantillas",
    titulo: "Plantillas de control",
    descripcion: "Crear y editar las listas de ítems a controlar",
    url: "/controles/checklist/plantillas",
    icon: "ListChecks",
  },
  {
    clave: "insumos",
    titulo: "Control de insumos",
    descripcion: "Carga y seguimiento de insumos por sucursal",
    url: "/controles/insumos",
    icon: "Package",
  },
  {
    clave: "incidencias",
    titulo: "Incidencias",
    descripcion: "Listado de incidencias de fichaje",
    url: "/controles/incidencias",
    icon: "AlertTriangle",
  },
  {
    clave: "resumen-mes",
    titulo: "Resumen del mes",
    descripcion: "Ausencias, feriados, domingos y horas extras",
    url: "/controles/resumen-mes",
    icon: "CalendarRange",
  },
  {
    clave: "vacaciones",
    titulo: "Vacaciones",
    descripcion: "Solicitudes, saldos y calendario de vacaciones",
    url: "/controles/vacaciones",
    icon: "Palmtree",
  },
  {
    clave: "planificacion",
    titulo: "Planificación semanal",
    descripcion: "Armar y revisar la planificación de la semana",
    url: "/controles/planificacion-semanal",
    icon: "Calendar",
  },
  {
    clave: "anotaciones",
    titulo: "Anotaciones",
    descripcion: "Registro de anotaciones de empleados",
    url: "/controles/anotaciones",
    icon: "FileText",
  },
  {
    clave: "tablero",
    titulo: "Tablero de proyectos",
    descripcion: "Tarjetas y tareas delegadas",
    url: "/controles/tablero",
    icon: "LayoutDashboard",
  },
  {
    clave: "entregas",
    titulo: "Entregas a empleados",
    descripcion: "Seguimiento de elementos entregados",
    url: "/controles/entregas",
    icon: "Boxes",
  },
];

export const CONTROLES_DEFAULT = ["checklist", "plantillas"];
