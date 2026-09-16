export type CandidatoEstado =
  | "nuevo"
  | "preseleccionado"
  | "seleccionado_entrevista"
  | "invitacion_generada"
  | "pendiente_reserva"
  | "entrevista_confirmada"
  | "entrevistado"
  | "no_asistio"
  | "descartado"
  | "seleccionado";

export type SlotEstado = "disponible" | "reservado" | "bloqueado";

export type EntrevistaEstado = "pendiente" | "confirmada" | "realizada" | "no_asistio" | "cancelada";

export const CANDIDATO_ESTADO_LABEL: Record<CandidatoEstado, string> = {
  nuevo: "Nuevo",
  preseleccionado: "Preseleccionado",
  seleccionado_entrevista: "Seleccionado para entrevista",
  invitacion_generada: "Invitación generada",
  pendiente_reserva: "Pendiente de reserva",
  entrevista_confirmada: "Entrevista confirmada",
  entrevistado: "Entrevistado",
  no_asistio: "No asistió",
  descartado: "Descartado",
  seleccionado: "Seleccionado",
};

export const ENTREVISTA_ESTADO_LABEL: Record<EntrevistaEstado, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  realizada: "Realizada",
  no_asistio: "No asistió",
  cancelada: "Cancelada",
};

export const DIAS_SEMANA = [
  { valor: 1, nombre: "Lunes" },
  { valor: 2, nombre: "Martes" },
  { valor: 3, nombre: "Miércoles" },
  { valor: 4, nombre: "Jueves" },
  { valor: 5, nombre: "Viernes" },
  { valor: 6, nombre: "Sábado" },
  { valor: 0, nombre: "Domingo" },
];

export interface PuestoReclutamiento {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface Candidato {
  id: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  puesto_id: string | null;
  estado: CandidatoEstado;
  origen: string;
  notas: string | null;
  created_at: string;
}

export interface EntrevistasConfig {
  id: string;
  nombre: string;
  duracion_minutos: number;
  sucursal_id: string | null;
  direccion: string | null;
  mensaje_whatsapp: string | null;
  activo: boolean;
}

export interface Disponibilidad {
  id: string;
  config_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface Excepcion {
  id: string;
  config_id: string;
  fecha: string;
  tipo: "bloqueo_dia" | "disponibilidad_extra";
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
}

export interface Slot {
  id: string;
  config_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: SlotEstado;
  entrevista_id: string | null;
}

export interface Entrevista {
  id: string;
  candidato_id: string;
  slot_id: string | null;
  puesto_id: string | null;
  direccion: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EntrevistaEstado;
  notas: string | null;
  candidatos?: { nombre: string; apellido: string | null; telefono: string | null } | null;
  reclutamiento_puestos?: { nombre: string } | null;
}

export interface Invitacion {
  id: string;
  candidato_id: string;
  token: string;
  estado: string;
  expira_at: string;
  invited_at: string;
  booked_at: string | null;
  entrevista_id: string | null;
  candidatos?: { nombre: string; apellido: string | null; telefono: string | null; puesto_id: string | null } | null;
}

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

export const enlaceReserva = (token: string) =>
  `${window.location.origin}/entrevista/reservar/${token}`;

export const mensajeWhatsapp = (
  nombre: string,
  puesto: string,
  token: string,
  plantilla?: string | null
) => {
  const link = enlaceReserva(token);
  if (plantilla) {
    return plantilla
      .replace(/\[Nombre\]/g, nombre)
      .replace(/\[Puesto\]/g, puesto)
      .replace(/\[LINK_UNICO\]/g, link);
  }
  return `Hola ${nombre}, ¿cómo estás?

Te contactamos de Mayorista Soto por tu postulación para ${puesto}.

Nos gustaría coordinar una entrevista.

Podés elegir directamente el día y horario que te resulte más cómodo desde el siguiente enlace:

${link}

Una vez seleccionado, tu entrevista quedará confirmada.

Gracias.
Mayorista Soto`;
};
