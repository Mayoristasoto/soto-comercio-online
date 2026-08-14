export interface DiaAusentismo {
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  fecha: string;
  dia_semana: number;
  estado: string;
  es_esperado: boolean;
  es_ausente: boolean;
  horas_esperadas: number;
  categoria_id: string | null;
  categoria_nombre: string | null;
  categoria_color: string | null;
  es_justificada: boolean | null;
  observacion: string | null;
}

export interface CeldaMes {
  esperados: number;
  ausentes: number;
  justificadas: number;
  sinJustificar: number;
  indice: number; // 0-100
}

export interface FilaEmpleado {
  empleado_id: string;
  nombre: string;
  legajo: string | null;
  sucursal_nombre: string | null;
  meses: Record<string, CeldaMes>;
  total: CeldaMes;
  tendencia: number; // pp: últimos 3 meses vs anteriores
  ausencias: DiaAusentismo[];
  alertas: string[];
}

export const DIAS_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
