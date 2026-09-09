export type PreguntaTipo = "estrellas" | "si_no" | "opciones" | "texto";

export interface EncuestaPregunta {
  id: string;
  texto: string;
  tipo: PreguntaTipo;
  opciones: string[];
  orden: number;
  obligatoria: boolean;
  activa: boolean;
}

export interface EncuestaConfig {
  id: string;
  titulo: string;
  bienvenida: string;
  agradecimiento: string;
  pide_email: boolean;
  pide_telefono: boolean;
  telefono_obligatorio: boolean;
  descuento_texto: string;
  descuento_vigencia_dias: number;
  codigo_prefijo: string;
  whatsapp_activo: boolean;
  whatsapp_api_url: string;
  whatsapp_mensaje: string;
}

export interface EncuestaRespuestaItem {
  pregunta_id: string;
  pregunta: string;
  tipo: PreguntaTipo;
  valor: string | number | null;
}

export interface EncuestaRespuesta {
  id: string;
  sucursal_id: string | null;
  control_id: string | null;
  cliente_nombre: string;
  cliente_email: string | null;
  cliente_telefono: string | null;
  respuestas: EncuestaRespuestaItem[];
  promedio_estrellas: number | null;
  comentario: string | null;
  codigo_descuento: string | null;
  descuento_texto: string | null;
  descuento_vence: string | null;
  whatsapp_estado: string;
  created_at: string;
}

export const TIPO_LABEL: Record<PreguntaTipo, string> = {
  estrellas: "Estrellas (1 a 5)",
  si_no: "Sí / No",
  opciones: "Opciones",
  texto: "Texto libre",
};

export function generarCodigo(prefijo: string) {
  const base = (prefijo || "SOTO").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "SOTO";
  const rnd = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `${base}-${rnd}${Date.now().toString().slice(-3)}`;
}
