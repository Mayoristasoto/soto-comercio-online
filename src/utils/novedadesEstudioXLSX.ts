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
}

const VERDE = "FFC6E0B4";
const ROJO = "FFFF7C80";
const GRIS = "FFD9D9D9";

const up = (s: string) => (s || "").toLocaleUpperCase("es-AR");
const dm = (d: string) => format(new Date(d + "T00:00:00"), "dd/MM");
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

/** Clasifica un día de novedad en la columna del estudio contable */
function clasificar(estado: string, detalle: string | null): "gremio" | "enf" | "enfFam" | "inasistencia" | null {
  const d = (detalle || "").toLowerCase();
  if (d.includes("gremio")) return "gremio";
  if (estado === "LIC_MEDICA") return "enf";
  if (estado === "NO_FICHADA") return "inasistencia";
  if (estado === "AUSENCIA_JUSTIFICADA" || estado === "OTRA_LICENCIA" || estado === "LICENCIA") {
    if (d.includes("familiar")) return "enfFam";
    if (d.includes("enfermedad") || d.includes("médic") || d.includes("medic") || d.includes("art") || d.includes("accidente")) return "enf";
    if (d.includes("sin justificar") || d.includes("ausente") || d.includes("injustificad")) return "inasistencia";
    return null;
  }
  return null;
}

const thin = { style: "thin" as const, color: { argb: "FF808080" } };
const bordeCompleto = { top: thin, left: thin, bottom: thin, right: thin };

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

export async function exportNovedadesEstudioXLSX(
  empleados: EmpleadoEstudio[],
  resumen: ResumenEmpleado[],
  desde: string,
  hasta: string,
  feriados: FeriadoTrabajadoRow[] = [],
  vacaciones: VacacionNovedadRow[] = [],
  adelantos: AdelantoNovedadRow[] = [],
) {
  const ref = new Date(desde + "T00:00:00");
  const mes = up(format(ref, "MMMM", { locale: es }));
  const anio = ref.getFullYear();

  const resMap = new Map(resumen.map(r => [r.empleado_id, r]));

  // Conteos por empleado
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

  const orden = (l: string | null) => {
    const n = Number(l);
    return Number.isFinite(n) ? n : 99999;
  };
  const lista = [...empleados].sort((a, b) => orden(a.legajo) - orden(b.legajo) || a.apellido.localeCompare(b.apellido));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Soto RRHH";
  const ws = wb.addWorksheet(mes.slice(0, 31), { views: [{ state: "frozen", ySplit: 3 }] });

  ws.columns = [
    { width: 8 }, { width: 34 }, { width: 26 }, { width: 9 }, { width: 10 },
    { width: 14 }, { width: 16 }, { width: 13 }, { width: 13 }, { width: 22 }, { width: 42 },
  ];

  // Título
  ws.mergeCells(1, 1, 1, 11);
  const titulo = ws.getCell("A1");
  titulo.value = `Novedades SOTO ${mes} ${anio}`;
  titulo.font = { bold: true, size: 14 };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;
  for (let c = 1; c <= 11; c++) ws.getCell(1, c).border = bordeCompleto;

  // Encabezados
  const headers = ["Legajo", "Apellido y Nombre", "OBRA SOCIAL", "Feriados", "Dia Gremio", "Lic Enfermedad", "Lic. Enf. Familiar", "Inasistencias", "Ds Vacaciones", "Fechas Vac", "Observaciones"];
  const headRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = bordeCompleto;
    fill(cell, GRIS);
  });
  headRow.height = 30;

  const anotaciones: string[] = [];
  let r = 4;

  for (const e of lista) {
    const res = resMap.get(e.id);
    let gremio = 0, enf = 0, enfFam = 0, inas = 0;
    for (const row of res?.rows || []) {
      const c = clasificar(row.estado, row.detalle);
      if (c === "gremio") gremio++;
      else if (c === "enf") enf++;
      else if (c === "enfFam") enfFam++;
      else if (c === "inasistencia") inas++;
    }

    const vac = vacPorEmp.get(e.id);
    const nombreCompleto = up(`${e.apellido} ${e.nombre}`);
    const obraSocial = e.obra_social
      ? e.obra_social + (e.obra_social_desde ? ` / Desde ${format(new Date(e.obra_social_desde + "T00:00:00"), "MM-yyyy")}` : "")
      : "";

    const adelanto = adePorEmp.get(e.id) || 0;
    const feriadosCant = feriadosPorEmp.get(e.id) || 0;
    const obs = `RECIBO POR ${e.horas_jornada_estandar ?? 8}HS`
      + (adelanto > 0 ? ` - ADELANTO ${money(adelanto)}` : "");

    const fila = ws.getRow(r);
    const valores: (string | number)[] = [
      e.legajo ?? "",
      nombreCompleto,
      obraSocial,
      feriadosCant || "",
      gremio || "",
      enf || "",
      enfFam || "",
      inas || "",
      vac?.dias || "",
      vac?.rangos.join(" / ") || "",
      obs,
    ];
    valores.forEach((v, i) => {
      const cell = fila.getCell(i + 1);
      cell.value = v === "" ? null : v;
      cell.border = bordeCompleto;
      cell.font = { size: 10 };
      cell.alignment = i >= 3 && i <= 8
        ? { horizontal: "center", vertical: "middle" }
        : { horizontal: "left", vertical: "middle", wrapText: i === 10 };
    });

    // Verde = novedades a liquidar
    if (feriadosCant > 0) fill(fila.getCell(4), VERDE);
    if (gremio > 0) fill(fila.getCell(5), VERDE);
    if (enf > 0) fill(fila.getCell(6), VERDE);
    if (enfFam > 0) fill(fila.getCell(7), VERDE);
    if (vac?.dias) { fill(fila.getCell(9), VERDE); fill(fila.getCell(10), VERDE); }
    if (adelanto > 0) fill(fila.getCell(11), VERDE);

    // Rojo = revisar
    if (inas > 0) fill(fila.getCell(8), ROJO);
    if (!e.legajo) fill(fila.getCell(1), ROJO);
    if (!obraSocial) fill(fila.getCell(3), ROJO);

    if (vac?.rangos.length) anotaciones.push(`${nombreCompleto} VACACIONES DEL ${vac.rangos.join(" Y DEL ")}`);
    if (enf > 0) anotaciones.push(`${nombreCompleto} ${enf} DIAS ENFERMEDAD`);
    if (enfFam > 0) anotaciones.push(`${nombreCompleto} ${enfFam} DIAS ENFERMEDAD FAMILIAR`);
    if (gremio > 0) anotaciones.push(`${nombreCompleto} ${gremio} DIA/S GREMIO`);
    if (inas > 0) anotaciones.push(`${nombreCompleto} ${inas} Inasistencias`);
    if (adelanto > 0) anotaciones.push(`${nombreCompleto} ADELANTO ${money(adelanto)}`);
    r++;
  }

  // Bloque de anotaciones generales
  r++;
  ws.mergeCells(r, 1, r, 11);
  const tAnot = ws.getCell(r, 1);
  tAnot.value = "ANOTACIONES GENERALES";
  tAnot.font = { bold: true, size: 11 };
  tAnot.alignment = { horizontal: "center", vertical: "middle" };
  fill(tAnot, GRIS);
  for (let c = 1; c <= 11; c++) ws.getCell(r, c).border = bordeCompleto;
  r++;

  const filasAnotaciones = Math.max(anotaciones.length, 13);
  for (let i = 0; i < filasAnotaciones; i++) {
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
    if (/inasistencia/i.test(texto)) fill(cell, ROJO);
    else if (texto) fill(cell, VERDE);
    r++;
  }

  // Referencia de colores
  r++;
  const refs: [string, string][] = [
    ["Novedad a liquidar (feriados, licencias, vacaciones, adelantos)", VERDE],
    ["Requiere revisión (inasistencias, falta legajo u obra social)", ROJO],
  ];
  for (const [txt, color] of refs) {
    const c1 = ws.getCell(r, 1);
    fill(c1, color);
    c1.border = bordeCompleto;
    ws.mergeCells(r, 2, r, 11);
    const c2 = ws.getCell(r, 2);
    c2.value = txt;
    c2.font = { size: 9, italic: true };
    c2.alignment = { horizontal: "left", vertical: "middle" };
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
