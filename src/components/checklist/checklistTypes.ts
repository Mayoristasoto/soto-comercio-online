export type ChecklistEstadoItem = "cumple" | "parcial" | "no_cumple";

export interface ChecklistItem {
  id: string;
  control_id: string;
  texto: string;
  seccion: string | null;
  orden: number;
  estado: ChecklistEstadoItem | null;
  observaciones: string | null;
}

export interface ChecklistFoto {
  id: string;
  item_id: string;
  storage_path: string;
}

export interface ChecklistControl {
  id: string;
  sucursal_id: string;
  plantilla_id: string | null;
  titulo: string | null;
  fecha_hora: string;
  responsable_id: string | null;
  estado: string;
  observaciones_generales: string | null;
  cerrado_at: string | null;
  cerrado_por: string | null;
}

export const BUCKET_EVIDENCIAS = "checklist-evidencias";

export const ESTADO_LABEL: Record<ChecklistEstadoItem, string> = {
  cumple: "Cumple",
  parcial: "Cumple Parcial",
  no_cumple: "No Cumple",
};

/** Clases de color por estado, usando los tokens semánticos del design system */
export const ESTADO_CLASSES: Record<ChecklistEstadoItem, string> = {
  cumple: "bg-success text-success-foreground hover:bg-success/90 border-success",
  parcial: "bg-warning text-warning-foreground hover:bg-warning/90 border-warning",
  no_cumple: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive",
};

export const ESTADO_SOFT_CLASSES: Record<ChecklistEstadoItem, string> = {
  cumple: "bg-success/10 text-success border-success/30",
  parcial: "bg-warning/10 text-warning border-warning/30",
  no_cumple: "bg-destructive/10 text-destructive border-destructive/30",
};

export function resumirItems(items: Pick<ChecklistItem, "estado">[]) {
  const cumple = items.filter((i) => i.estado === "cumple").length;
  const parcial = items.filter((i) => i.estado === "parcial").length;
  const noCumple = items.filter((i) => i.estado === "no_cumple").length;
  const sinEvaluar = items.filter((i) => !i.estado).length;
  const evaluados = cumple + parcial + noCumple;
  const porcentaje = evaluados > 0 ? Math.round(((cumple + parcial * 0.5) / evaluados) * 100) : 0;
  return { total: items.length, cumple, parcial, noCumple, sinEvaluar, evaluados, porcentaje };
}
