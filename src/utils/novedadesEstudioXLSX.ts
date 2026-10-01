import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ResumenEmpleado } from "@/pages/NovedadesLiquidacion";
import type { FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";
import type { VacacionNovedadRow } from "@/components/novedades/VacacionesNovedadesTable";
import type { AdelantoNovedadRow } from "@/components/novedades/AdelantosNovedadesTable";

export interface EmpleadoEstudio {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  obra_social: string | null;
  obra_social_desde: string | null;
  horas_jornada_estandar: number | null;
  exento_fichaje?: boolean | null;
}

export const COLUMNAS_ESTUDIO = [
  { key: "legajo", label: "Legajo", num: false },
  { key: "nombre", label: "Apellido y Nombre", num: false },
  { key: "obraSocial", label: "OBRA SOCIAL", num: false },
  { key: "feriados", label: "Feriados", num: true },
  { key: "gremio", label: "Dia Gremio", num: true },
  { key: "enf", label: "Lic Enfermedad", num: true },
  { key: "enfFam", label: "Lic. Enf. Familiar", num: true },
  { key: "inas", label: "Inasistencias", num: true },
  { key: "vacDias", label: "Ds Vacaciones", num: true },
  { key: "vacFechas", label: "Fechas Vac", num: false },
  { key: "obs", label: "Observaciones", num: false },
] as const;

export type ColEstudio = typeof COLUMNAS_ESTUDIO[number]["key"];
export type FilaEstudio = { id: string; manual?: boolean; adelanto?: boolean } & Record<ColEstudio, string | number | "">;

const VERDE = "FFC6E0B4";
const ROJO = "FFFF7C80";
const GRIS = "FFD9D9D9";
const AMARILLO = "FFFFF2CC";

const up = (s: string) => (s || "").toLocaleUpperCase("es-AR");
const dm = (d: string) => format(new Date(d + "T00:00:00"), "dd/MM");
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

function clasificar(estado: string, detalle: string | null): "gremio" | "enf" | "enfFam" | "inasistencia" | null {
  const d = (detalle || "").toLowerCase();
  if (d.includes("gremio")) return "gremio";
  if (d.includes("familiar")) return "enfFam";
  if (d.includes("enferm") || d.includes("médic") || d.includes("medic") || d.includes("accidente") || /\bart\b/.test(d)) return "enf";
  if (estado === "LIC_MEDICA") return "enf";
  if (estado === "NO_FICHADA") return "inasistencia";
  if (estado === "AUSENCIA_JUSTIFICADA" || estado === "OTRA_LICENCIA" || estado === "LICENCIA") {
    if (d.includes("sin justificar") || d.includes("ausente") || d.includes("injustificad")) return "inasistencia";
    return null;
  }
  return null;
}

export function anotacionesDeFilas(filas: FilaEstudio[]): string[] {
  const out: string[] = [];
  for (const f of filas) {
    const n = String(f.nombre || "");
    const num = (v: any) => Number(v) || 0;
    if (f.vacFechas) out.push(`${n} VACACIONES DEL ${String(f.vacFechas).split(" / ").join(" Y DEL ")}`);
    if (num(f.enf)) out.push(`${n} ${num(f.enf)} DIAS ENFERMEDAD`);
    if (num(f.enfFam)) out.push(`${n} ${num(f.enfFam)} DIAS ENFERMEDAD FAMILIAR`);
    if (num(f.gremio)) out.push(`${n} ${num(f.gremio)} DIA/S GREMIO`);
    if (num(f.inas)) out.push(`${n} ${num(f.inas)} Inasistencias`);
    const m = String(f.obs || "").match(/ADELANTO \$[\d.]+/);
    if (m) out.push(`${n} ${m[0]}`);
  }
  return out;
}

export function construirFilasEstudio(
  empleados: EmpleadoEstudio[],
  resumen: ResumenEmpleado[],
  feriados: FeriadoTrabajadoRow[] = [],
  vacaciones: VacacionNovedadRow[] = [],
  adelantos: AdelantoNovedadRow[] = [],
): FilaEstudio[] {
  const resMap = new Map(resumen.map(r => [r.empleado_id, r]));
  const feriadosPorEmp = new Map<string, number>();
  for (const f of feriados) {
    const k = (f as any).empleado_id as string;
    if (k) feriadosPorEmp.set(k, (feriadosPorEmp.get(k) || 0) + 1);
  }
  const vacPorEmp = new Map<string, { dias: number; rangos: string[] }>();
  for (const v of vacaciones) {
    const acc = vacPorEmp.get(v.empleado_id) || { dias: 0, rangos: [] };
    acc.dias += v.dias_en_periodo;
    acc.rangos.push(`${dm(v.fecha_inicio)} al ${dm(v.fecha_fin)}`);
    vacPorEmp.set(v.empleado_id, acc);
  }
  const adePorEmp = new Map<string, number>();
  for (const a of adelantos) {
    if (String(a.estado).toLowerCase() !== "aprobada") continue;
    adePorEmp.set(a.empleado_id, (adePorEmp.get(a.empleado_id) || 0) + Number(a.monto || 0));
  }
  const orden = (l: string | null) => { const n = Number(l); return Number.isFinite(n) ? n : 99999; };
  const lista = [...empleados].sort((a, b) => orden(a.legajo) - orden(b.legajo) || a.apellido.localeCompare(b.apellido));

  return lista.map(e => {
    let gremio = 0, enf = 0, enfFam = 0, inas = 0;
    for (const row of resMap.get(e.id)?.rows || []) {
      const c = clasificar(row.estado, row.detalle);
      if (c === "gremio") gremio++; else if (c === "enf") enf++; else if (c === "enfFam") enfFam++; else if (c === "inasistencia") inas++;
    }
    if (e.exento_fichaje) inas = 0;
    const vac = vacPorEmp.get(e.id);
    const adelanto = adePorEmp.get(e.id) || 0;
    const obraSocial = e.obra_social
      ? e.obra_social + (e.obra_social_desde ? ` / Desde ${format(new Date(e.obra_social_desde + "T00:00:00"), "MM-yyyy")}` : "")
      : "";
    return {
      id: e.id,
      legajo: e.legajo ?? "",
      nombre: up(`${e.apellido} ${e.nombre}`),
      obraSocial,
      feriados: feriadosPorEmp.get(e.id) || "",
      gremio: gremio || "",
      enf: enf || "",
      enfFam: enfFam || "",
      inas: inas || "",
      vacDias: vac?.dias || "",
      vacFechas: vac?.rangos.join(" / ") || "",
      obs: `RECIBO POR ${e.horas_jornada_estandar ?? 8}HS` + (adelanto > 0 ? ` - ADELANTO ${money(adelanto)}` : ""),
    };
  });
}

const thin = { style: "thin" as const, color: { argb: "FF808080" } };
const bordeCompleto = { top: thin, left: thin, bottom: thin, right: thin };
function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

/** Exporta filas ya resueltas. `manuales` = set de "filaId:col" editadas a mano (se pintan amarillo). */
export async function exportarEstudioDesdeFilas(
  filas: FilaEstudio[],
  anotaciones: string[],
  desde: string,
  manuales: Set<string> = new Set(),
) {
  const ref = new Date(desde + "T00:00:00");
  const mes = up(format(ref, "MMMM", { locale: es }));
  const anio = ref.getFullYear();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Soto RRHH";
  const ws = wb.addWorksheet(mes.slice(0, 31), { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [8, 34, 26, 9, 10, 14, 16, 13, 13, 22, 42].map(width => ({ width }));

  ws.mergeCells(1, 1, 1, 11);
  const titulo = ws.getCell("A1");
  titulo.value = `Novedades SOTO ${mes} ${anio}`;
  titulo.font = { bold: true, size: 14 };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;
  for (let c = 1; c <= 11; c++) ws.getCell(1, c).border = bordeCompleto;

  const headRow = ws.getRow(3);
  COLUMNAS_ESTUDIO.forEach((h, i) => {
    const cell = headRow.getCell(i + 1);
    cell.value = h.label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = bordeCompleto;
    fill(cell, GRIS);
  });
  headRow.height = 30;

  let r = 4;
  for (const f of filas) {
    const fila = ws.getRow(r);
    COLUMNAS_ESTUDIO.forEach((col, i) => {
      const cell = fila.getCell(i + 1);
      const v = f[col.key];
      cell.value = v === "" || v == null ? null : (col.num && !isNaN(Number(v)) ? Number(v) : v);
      cell.border = bordeCompleto;
      cell.font = { size: 10 };
      cell.alignment = col.num ? { horizontal: "center", vertical: "middle" } : { horizontal: "left", vertical: "middle", wrapText: i === 10 };
      const has = v !== "" && v != null && v !== 0;
      if (["feriados", "gremio", "enf", "enfFam", "vacDias", "vacFechas"].includes(col.key) && has) fill(cell, VERDE);
      if (col.key === "obs" && /ADELANTO/.test(String(v))) fill(cell, VERDE);
      if (col.key === "inas" && has) fill(cell, ROJO);
      if ((col.key === "legajo" || col.key === "obraSocial") && !has) fill(cell, ROJO);
      if (manuales.has(`${f.id}:${col.key}`) || f.manual) fill(cell, AMARILLO);
    });
    r++;
  }

  r++;
  ws.mergeCells(r, 1, r, 11);
  const tAnot = ws.getCell(r, 1);
  tAnot.value = "ANOTACIONES GENERALES";
  tAnot.font = { bold: true, size: 11 };
  tAnot.alignment = { horizontal: "center", vertical: "middle" };
  fill(tAnot, GRIS);
  for (let c = 1; c <= 11; c++) ws.getCell(r, c).border = bordeCompleto;
  r++;
  const n = Math.max(anotaciones.length, 13);
  for (let i = 0; i < n; i++) {
    const texto = anotaciones[i] ?? "";
    const nro = ws.getCell(r, 1);
    nro.value = i + 1;
    nro.alignment = { horizontal: "center", vertical: "middle" };
    nro.border = bordeCompleto;
    nro.font = { size: 10 };
    ws.mergeCells(r, 2, r, 11);
    const cell = ws.getCell(r, 2);
    cell.value = texto || null;
    cell.alignment = { horizontal: "left", vertical: "middle" };
    cell.font = { size: 10 };
    for (let c = 2; c <= 11; c++) ws.getCell(r, c).border = bordeCompleto;
    if (/inasistencia/i.test(texto)) fill(cell, ROJO); else if (texto) fill(cell, VERDE);
    r++;
  }

  r++;
  const refs: [string, string][] = [
    ["Novedad a liquidar (feriados, licencias, vacaciones, adelantos)", VERDE],
    ["Requiere revisión (inasistencias, falta legajo u obra social)", ROJO],
    ["Cargado o corregido manualmente", AMARILLO],
  ];
  for (const [txt, color] of refs) {
    const c1 = ws.getCell(r, 1);
    fill(c1, color);
    c1.border = bordeCompleto;
    ws.mergeCells(r, 2, r, 11);
    const c2 = ws.getCell(r, 2);
    c2.value = txt;
    c2.font = { size: 9, italic: true };
    r++;
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Novedades_SOTO_${mes}_${anio}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportNovedadesEstudioXLSX(
  empleados: EmpleadoEstudio[],
  resumen: ResumenEmpleado[],
  desde: string,
  _hasta: string,
  feriados: FeriadoTrabajadoRow[] = [],
  vacaciones: VacacionNovedadRow[] = [],
  adelantos: AdelantoNovedadRow[] = [],
) {
  const filas = construirFilasEstudio(empleados, resumen, feriados, vacaciones, adelantos);
  await exportarEstudioDesdeFilas(filas, anotacionesDeFilas(filas), desde);
}
