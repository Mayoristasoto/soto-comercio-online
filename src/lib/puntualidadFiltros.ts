import type { MesRes, ResumenEmpleado } from "@/utils/informePuntualidadPDF";

export type TipoPuntualidad = "todos" | "tarde" | "descanso";
export type OrdenPuntualidad = "cantidad" | "minutos" | "nombre" | "tendencia" | `mes:${string}`;

export const columnaDeMes = (mes: string): OrdenPuntualidad => `mes:${mes}` as OrdenPuntualidad;
export const mesDeColumna = (orden: OrdenPuntualidad): string | null => (orden.startsWith("mes:") ? orden.slice(4) : null);

const conteoDe = (p: MesRes | undefined) => (p ? p.tardes + p.descansos : 0);
const minutosDe = (p: MesRes | undefined) => (p ? p.minTarde + p.minDescanso : 0);
const sumar = (r: ResumenEmpleado, f: (p: MesRes) => number) => Object.values(r.porMes).reduce((s, p) => s + f(p), 0);

export function tendenciaPuntualidad(r: ResumenEmpleado, meses: string[]): number {
  if (meses.length < 2) return 0;
  return conteoDe(r.porMes[meses[meses.length - 1]]) - conteoDe(r.porMes[meses[meses.length - 2]]);
}

export function filtrarOrdenarPuntualidad(
  resumen: ResumenEmpleado[], tipo: TipoPuntualidad, orden: OrdenPuntualidad, ascendente: boolean, meses: string[] = [],
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
  const mes = mesDeColumna(orden);
  const valor = (r: ResumenEmpleado) => {
    if (mes) return conteoDe(r.porMes[mes]);
    if (orden === "minutos") return sumar(r, minutosDe);
    if (orden === "tendencia") return tendenciaPuntualidad(r, meses);
    return sumar(r, conteoDe);
  };
  const desempate = (r: ResumenEmpleado) => {
    if (mes) return minutosDe(r.porMes[mes]);
    if (orden === "minutos" || orden === "tendencia") return sumar(r, conteoDe);
    return sumar(r, minutosDe);
  };
  const sentido = (n: number) => (ascendente ? n : -n);
  return filtrados.sort((a, b) => {
    if (orden === "nombre") return sentido(a.nombre.localeCompare(b.nombre, "es"));
    const diferencia = valor(a) - valor(b);
    if (diferencia !== 0) return sentido(diferencia);
    const empate = desempate(a) - desempate(b);
    if (empate !== 0) return sentido(empate);
    return a.nombre.localeCompare(b.nombre, "es");
  });
}
