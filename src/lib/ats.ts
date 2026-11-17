// Lógica pura del ATS (compartida por panel y pruebas).
export const ESTADOS_POSTULACION = [
  { v: "nuevo", l: "Nuevo" },
  { v: "en_revision", l: "En revisión" },
  { v: "entrevista", l: "Entrevista" },
  { v: "finalista", l: "Finalista" },
  { v: "seleccionado", l: "Seleccionado" },
  { v: "base_talentos", l: "Base de talentos" },
  { v: "descartado", l: "Descartado" },
] as const;

export const estadoLabel = (v: string) => ESTADOS_POSTULACION.find((e) => e.v === v)?.l ?? v;

export function puntajeTotal(crit: { peso: number; puntaje: number }[]) {
  const pesos = crit.reduce((a, c) => a + (Number(c.peso) || 0), 0);
  if (!pesos) return 0;
  return Math.round(crit.reduce((a, c) => a + c.puntaje * (Number(c.peso) || 0), 0) / pesos);
}

/** Ranking: mayor puntaje primero; sin evaluar al final; nunca excluye a nadie. */
export function ordenarRanking<T extends { score: number | null; created_at: string }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => {
    if (a.score == null && b.score == null) return b.created_at.localeCompare(a.created_at);
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return b.score - a.score || b.created_at.localeCompare(a.created_at);
  });
}

export const nivelPuntaje = (s: number | null) =>
  s == null ? "sin" : s >= 75 ? "alto" : s >= 50 ? "medio" : "bajo";

export const CRITERIOS_SUGERIDOS: Record<string, { criterio: string; peso: number; descripcion: string }[]> = {
  cajero: [
    { criterio: "Experiencia en caja", peso: 35, descripcion: "Cobro, arqueo, posnet, efectivo" },
    { criterio: "Atención al cliente", peso: 25, descripcion: "Trato con público, comercio" },
    { criterio: "Rubro supermercado/mayorista", peso: 20, descripcion: "Experiencia en el rubro" },
    { criterio: "Estabilidad laboral", peso: 10, descripcion: "Permanencia en empleos" },
    { criterio: "Formación", peso: 10, descripcion: "Secundario completo, cursos" },
  ],
  repositor: [
    { criterio: "Experiencia en reposición", peso: 35, descripcion: "Góndolas, rotación, vencimientos" },
    { criterio: "Rubro supermercado/mayorista", peso: 25, descripcion: "" },
    { criterio: "Trabajo físico y orden", peso: 20, descripcion: "Carga, depósito, orden" },
    { criterio: "Estabilidad laboral", peso: 20, descripcion: "" },
  ],
  encargado: [
    { criterio: "Manejo de personal", peso: 35, descripcion: "Equipos a cargo, turnos" },
    { criterio: "Experiencia en sucursal/comercio", peso: 25, descripcion: "" },
    { criterio: "Gestión operativa", peso: 20, descripcion: "Stock, caja, controles, indicadores" },
    { criterio: "Herramientas y sistemas", peso: 10, descripcion: "" },
    { criterio: "Formación", peso: 10, descripcion: "" },
  ],
  deposito: [
    { criterio: "Experiencia en depósito/logística", peso: 40, descripcion: "Recepción, picking, despacho" },
    { criterio: "Autoelevador / zorra", peso: 20, descripcion: "Licencia o experiencia" },
    { criterio: "Control de stock", peso: 20, descripcion: "" },
    { criterio: "Estabilidad laboral", peso: 20, descripcion: "" },
  ],
  administrativo: [
    { criterio: "Experiencia administrativa", peso: 35, descripcion: "" },
    { criterio: "Herramientas (Excel, sistemas)", peso: 25, descripcion: "" },
    { criterio: "Formación", peso: 25, descripcion: "Terciario/universitario afín" },
    { criterio: "Estabilidad laboral", peso: 15, descripcion: "" },
  ],
};

export function sugerirCriterios(nombrePuesto: string) {
  const n = nombrePuesto.toLowerCase();
  const k = Object.keys(CRITERIOS_SUGERIDOS).find((k) => n.includes(k.slice(0, 6)));
  return k ? CRITERIOS_SUGERIDOS[k] : [
    { criterio: "Experiencia laboral relacionada", peso: 40, descripcion: "" },
    { criterio: "Responsabilidades y logros", peso: 30, descripcion: "" },
    { criterio: "Conocimientos y herramientas", peso: 20, descripcion: "" },
    { criterio: "Formación", peso: 10, descripcion: "" },
  ];
}
