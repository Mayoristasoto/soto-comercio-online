// Tipos del módulo Recorrido de Salón (independiente de Góndolas)
export type EstadoHallazgo = "cumple" | "parcial" | "no_cumple";

export interface RecorridoPlano {
  id: string;
  sucursal_id: string;
  nombre: string;
  ancho: number;
  alto: number;
  imagen_path: string | null;
  /** true = usa el layout de góndolas (copia v2) como fondo en lugar de una imagen */
  usa_gondolas?: boolean | null;
  activo: boolean;
}

export interface RecorridoZona {
  id: string;
  plano_id: string;
  nombre: string;
  orden: number;
  // coordenadas en porcentaje (0-100) sobre la imagen
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Punto controlable dentro de una zona (ej: góndola 3 del pasillo 1) */
export interface RecorridoPunto {
  id: string;
  zona_id: string;
  nombre: string;
  gondola_ref: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  orden: number;
}

export type EstadoSeguimiento = "abierto" | "en_tarea" | "resuelto";

export const ESTADO_SEGUIMIENTO_LABEL: Record<EstadoSeguimiento, string> = {
  abierto: "Abierto",
  en_tarea: "Tarea asignada",
  resuelto: "Resuelto",
};

export interface HistorialPuntoRow {
  origen: string;
  id: string;
  punto_id: string | null;
  zona_id: string | null;
  sucursal_id: string | null;
  zona_nombre: string | null;
  punto_nombre: string | null;
  detalle: string | null;
  estado: string | null;
  observaciones: string | null;
  estado_seguimiento: string | null;
  fecha: string;
  responsable_id: string | null;
  fotos: number;
}

export interface RecorridoCriterio {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  obligatorio: boolean;
  activo: boolean;
}

export interface Recorrido {
  id: string;
  sucursal_id: string;
  plano_id: string | null;
  titulo: string | null;
  fecha_hora: string;
  responsable_id: string | null;
  estado: string; // borrador | completado
  observaciones_generales: string | null;
  cerrado_at: string | null;
}

export interface RecorridoHallazgo {
  id: string;
  recorrido_id: string;
  zona_id: string | null;
  zona_nombre: string | null;
  punto_id: string | null;
  punto_nombre: string | null;
  sucursal_id: string | null;
  criterio_id: string | null;
  criterio_nombre: string | null;
  estado: EstadoHallazgo | null;
  punto_x: number | null;
  punto_y: number | null;
  observaciones: string | null;
  estado_seguimiento: string | null;
  tarea_id: string | null;
  resuelto_at: string | null;
  orden: number;
}

export const BUCKET_PLANOS = "recorrido-planos";
// Fotos de evidencia: mismo bucket que el checklist de control
export { BUCKET_EVIDENCIAS } from "../checklist/checklistTypes";

export const ESTADO_HALLAZGO_LABEL: Record<EstadoHallazgo, string> = {
  cumple: "Cumple",
  parcial: "Parcial",
  no_cumple: "No cumple",
};

export const ESTADO_HALLAZGO_DOT: Record<EstadoHallazgo, string> = {
  cumple: "bg-emerald-500",
  parcial: "bg-amber-400",
  no_cumple: "bg-red-500",
};

/** Prioridad para colorear zonas: lo peor manda */
export const peorEstado = (estados: (EstadoHallazgo | null)[]): EstadoHallazgo | null => {
  if (estados.includes("no_cumple")) return "no_cumple";
  if (estados.includes("parcial")) return "parcial";
  if (estados.includes("cumple")) return "cumple";
  return null;
};
