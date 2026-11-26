export const CATEGORIAS_AVISO = [
  { id: "exigencia", label: "Exigencia (llegadas tarde del mes)" },
  { id: "solicitudes", label: "Solicitudes de empleados (vacaciones, adelantos, permisos, etc.)" },
  { id: "insumos", label: "Control de insumos" },
  { id: "novedades", label: "Novedades de sucursal y calendario" },
  { id: "otros", label: "Otros avisos" },
] as const

export type CategoriaAviso = typeof CATEGORIAS_AVISO[number]["id"]

export function categoriaDe(n: { tipo?: string | null; titulo?: string | null }): CategoriaAviso {
  const t = n.tipo || ""
  if ((n.titulo || "").startsWith("Exigencia")) return "exigencia"
  if (t.startsWith("solicitud")) return "solicitudes"
  if (t === "insumos") return "insumos"
  if (t === "novedad_sucursal" || t === "evento_calendario") return "novedades"
  return "otros"
}
