import type { ResumenEmpleado } from "@/utils/informePuntualidadPDF";

export type TipoPuntualidad = "todos" | "tarde" | "descanso";
export type OrdenPuntualidad = "cantidad" | "minutos" | "nombre";

export function filtrarOrdenarPuntualidad(
  resumen: ResumenEmpleado[], tipo: TipoPuntualidad, orden: OrdenPuntualidad, ascendente: boolean,
): ResumenEmpleado[] {
  const filtrados = resumen.map(r => {
    const eventos = r.eventos.filter(e => tipo === "todos" || e.tipo === tipo);
    const porMes = Object.fromEntries(Object.entries(r.porMes).map(([mes, p]) => [mes, {
      tardes: tipo === "descanso" ? 0 : p.tardes,
      minTarde: tipo === "descanso" ? 0 : p.minTarde,
      descansos: tipo === "tarde" ? 0 : p.descansos,
      minDescanso: tipo === "tarde" ? 0 : p.minDescanso,
    }]));
    return { ...r, eventos, porMes, revisar: tipo !== "descanso" && r.revisar };
  }).filter(r => r.eventos.length > 0);
  const valor = (r: ResumenEmpleado) => Object.values(r.porMes).reduce((sum, p) =>
    sum + (orden === "minutos" ? p.minTarde + p.minDescanso : p.tardes + p.descansos), 0);
  return filtrados.sort((a, b) => {
    const diferencia = orden === "nombre" ? a.nombre.localeCompare(b.nombre, "es") : valor(a) - valor(b);
    return (ascendente ? diferencia : -diferencia) || a.nombre.localeCompare(b.nombre, "es");
  });
}