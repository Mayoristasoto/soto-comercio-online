import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_STYLES, COMPANY_INFO } from "./pdfStyles";
import { getArgentinaDateString, getArgentinaTimeString, toArgentinaTime } from "@/lib/dateUtils";

export interface FichajeRow {
  empleado_id: string;
  tipo: string;
  timestamp_real: string;
  empleado?: { nombre: string; apellido: string; sucursal_id: string | null } | null;
}

export interface JornadaCalculada {
  fecha: string; // yyyy-MM-dd argentina
  empleadoId: string;
  empleadoNombre: string;
  sucursalNombre: string;
  entrada: string; // HH:mm
  salida: string; // HH:mm
  esDomingo: boolean;
  baseHs: number;
  brutasHs: number;
  extraHs: number;
}

export interface ResumenEmpleado {
  empleadoNombre: string;
  hsExtraHabil: number;
  hsExtraDomingo: number;
  totalDomingo: number;
}

const loadLogo = (): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      } else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = COMPANY_INFO.logo;
  });

export function calcularJornadas(
  fichajes: FichajeRow[],
  sucursales: Map<string, string>
): JornadaCalculada[] {
  // group by empleado + fecha argentina
  const groups = new Map<string, FichajeRow[]>();
  for (const f of fichajes) {
    if (f.tipo !== "entrada" && f.tipo !== "salida") continue;
    const fecha = getArgentinaDateString(f.timestamp_real);
    const key = `${f.empleado_id}|${fecha}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const jornadas: JornadaCalculada[] = [];
  for (const [key, list] of groups) {
    const [empleadoId, fecha] = key.split("|");
    const entradas = list.filter((x) => x.tipo === "entrada").sort((a, b) => a.timestamp_real.localeCompare(b.timestamp_real));
    const salidas = list.filter((x) => x.tipo === "salida").sort((a, b) => a.timestamp_real.localeCompare(b.timestamp_real));
    if (entradas.length === 0 || salidas.length === 0) continue;
    const entrada = entradas[0];
    const salida = salidas[salidas.length - 1];
    const ms = new Date(salida.timestamp_real).getTime() - new Date(entrada.timestamp_real).getTime();
    if (ms <= 0) continue;
    const brutasHs = ms / (1000 * 60 * 60);

    // Day of week in Argentina
    const arg = toArgentinaTime(entrada.timestamp_real);
    const dow = arg.getUTCDay(); // since toArgentinaTime returns UTC-shifted
    const esDomingo = dow === 0;
    const baseHs = esDomingo ? 4 : 8;
    const extraHs = Math.max(0, brutasHs - baseHs);

    const emp = entrada.empleado;
    const empleadoNombre = emp ? `${emp.apellido}, ${emp.nombre}` : "—";
    const sucursalNombre = emp?.sucursal_id ? sucursales.get(emp.sucursal_id) || "—" : "—";

    jornadas.push({
      fecha,
      empleadoId,
      empleadoNombre,
      sucursalNombre,
      entrada: getArgentinaTimeString(entrada.timestamp_real).slice(0, 5),
      salida: getArgentinaTimeString(salida.timestamp_real).slice(0, 5),
      esDomingo,
      baseHs,
      brutasHs,
      extraHs,
    });
  }

  jornadas.sort((a, b) => (a.fecha === b.fecha ? a.empleadoNombre.localeCompare(b.empleadoNombre) : a.fecha.localeCompare(b.fecha)));
  return jornadas;
}

export function calcularResumen(jornadas: JornadaCalculada[]): ResumenEmpleado[] {
  const map = new Map<string, ResumenEmpleado>();
  for (const j of jornadas) {
    if (!map.has(j.empleadoId)) {
      map.set(j.empleadoId, {
        empleadoNombre: j.empleadoNombre,
        hsExtraHabil: 0,
        hsExtraDomingo: 0,
        totalDomingo: 0,
      });
    }
    const r = map.get(j.empleadoId)!;
    if (j.esDomingo) {
      r.hsExtraDomingo += j.extraHs;
      r.totalDomingo += j.brutasHs;
    } else {
      r.hsExtraHabil += j.extraHs;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.empleadoNombre.localeCompare(b.empleadoNombre));
}

const fmtHs = (h: number) => {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}h ${mm.toString().padStart(2, "0")}m`;
};

const fmtFecha = (yyyymmdd: string) => {
  const [y, m, d] = yyyymmdd.split("-");
  return `${d}/${m}/${y}`;
};

export async function generarReporteHorasExtrasPDF(opts: {
  fichajes: FichajeRow[];
  sucursales: Map<string, string>;
  fechaDesde: string;
  fechaHasta: string;
  sucursalLabel: string;
  empleadosLabel: string;
}) {
  const { fichajes, sucursales, fechaDesde, fechaHasta, sucursalLabel, empleadosLabel } = opts;

  const jornadas = calcularJornadas(fichajes, sucursales);
  const detalle = jornadas.filter((j) => j.extraHs > 0);
  const resumen = calcularResumen(jornadas);

  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header band
  doc.setFillColor(PDF_STYLES.colors.primary);
  doc.rect(0, 0, pageW, 28, "F");
  const logo = await loadLogo();
  if (logo) {
    try { doc.addImage(logo, "JPEG", margin, 6, 16, 16); } catch {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Horas Extras", margin + 20, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${fmtFecha(fechaDesde)} – ${fmtFecha(fechaHasta)}`, margin + 20, 19);
  doc.text(`Sucursal: ${sucursalLabel}    Empleados: ${empleadosLabel}`, margin + 20, 24);

  doc.setTextColor(PDF_STYLES.colors.text);

  let y = 36;

  // Detail table
  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Empleado", "Sucursal", "Entrada", "Salida", "Base", "Hs extra"]],
    body: detalle.map((j) => [
      fmtFecha(j.fecha),
      j.empleadoNombre,
      j.sucursalNombre,
      j.entrada,
      j.salida,
      `${j.baseHs}h`,
      fmtHs(j.extraHs),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [75, 13, 109], textColor: 255, fontStyle: "bold" },
    didParseCell: (data) => {
      if (data.section === "body" && detalle[data.row.index]?.esDomingo) {
        data.cell.styles.fillColor = [253, 231, 211];
        data.cell.styles.textColor = [224, 68, 3];
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Summary
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen por empleado", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Empleado", "Hs extra hábil", "Hs extra DOMINGO", "Total trabajado DOMINGO"]],
    body: resumen.map((r) => [r.empleadoNombre, fmtHs(r.hsExtraHabil), fmtHs(r.hsExtraDomingo), fmtHs(r.totalDomingo)]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [149, 25, 141], textColor: 255 },
    margin: { left: margin, right: margin },
  });

  // Totals
  const totalHabil = resumen.reduce((a, b) => a + b.hsExtraHabil, 0);
  const totalDom = resumen.reduce((a, b) => a + b.hsExtraDomingo, 0);
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text(`Totales — Hábil: ${fmtHs(totalHabil)}    Domingo: ${fmtHs(totalDom)}`, margin, y);

  const fileName = `reporte_horas_extras_${fechaDesde}_${fechaHasta}.pdf`;
  doc.save(fileName);
}
