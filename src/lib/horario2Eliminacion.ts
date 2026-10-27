export function puedeQuitarImportadoAprobado(esRRHH: boolean, plan: { estado: string; vigente: boolean } | null, turno: { observaciones?: string | null }) {
  return esRRHH && plan?.estado === "aprobado" && plan.vigente === true &&
    (turno.observaciones || "").includes("Importado de horarios legacy");
}