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

export interface ConfigHorasExtras {
  valorHoraHabil: number;
  valorHoraDomingo: number;
  toleranciaMin: number;
  baseHabilHs: number;
  baseDomingoHs: number;
  redondeoMin: number;        // tamaño del bloque de redondeo en minutos (0 = sin redondeo)
  redondeoUmbralMin: number;  // minutos sobrantes a partir de los cuales se redondea hacia arriba
  horaEntradaRef: string;     // "HH:MM" — minutos fichados antes de esta hora no se computan
}

export const DEFAULT_CONFIG_HE: ConfigHorasExtras = {
  valorHoraHabil: 0,
  valorHoraDomingo: 0,
  toleranciaMin: 19,
  baseHabilHs: 8,
  baseDomingoHs: 4,
  redondeoMin: 30,
  redondeoUmbralMin: 19,
  horaEntradaRef: "09:00",
};

/**
 * Redondeo global de horas extra (regla fija para todos los empleados):
 *   - 0 a 18 minutos sobrantes  → 0
 *   - 19 a 44 minutos sobrantes → 30 minutos (0,5 h)
 *   - 45 a 59 minutos sobrantes → 60 minutos (1 h)
 * Se aplica sobre la fracción dentro de cada hora completa.
 */
function aplicarRedondeo(extraHs: number, _config: ConfigHorasExtras): number {
  if (extraHs <= 0) return 0;
  const totalMin = Math.round(extraHs * 60);
  const horas = Math.floor(totalMin / 60);
  const resto = totalMin - horas * 60;
  let addMin = 0;
  if (resto >= 45) addMin = 60;
  else if (resto >= 19) addMin = 30;
  return (horas * 60 + addMin) / 60;
}

/** Formato corto de minutos: "50 min", "1h 05m", "0" */
function fmtMinShort(min: number): string {
  if (min <= 0) return "0";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}

function fmtHsShort(h: number): string {
  return fmtMinShort(Math.round(h * 60));
}

export interface JornadaCalculada {
  fecha: string;
  empleadoId: string;
  empleadoNombre: string;
  sucursalNombre: string;
  entrada: string;
  salida: string;
  esDomingo: boolean;
  baseHs: number;
  brutasHs: number;
  extraHs: number; // ya con tolerancia aplicada
  extraHsBruto: number; // sin tolerancia (informativo)
}

export interface ResumenEmpleado {
  empleadoNombre: string;
  hsExtraHabil: number;
  hsExtraDomingo: number;
  totalDomingo: number;
  montoHabil: number;
  montoDomingo: number;
  montoTotal: number;
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
  sucursales: Map<string, string>,
  config: ConfigHorasExtras = DEFAULT_CONFIG_HE
): JornadaCalculada[] {
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
    const entradaRealMs = new Date(entrada.timestamp_real).getTime();
    const salidaMs = new Date(salida.timestamp_real).getTime();

    // Construir hora de entrada de referencia para esa fecha en zona Argentina (UTC-3).
    // `fecha` ya viene en YYYY-MM-DD calculado en horario Argentina.
    const [hhRef, mmRef] = (config.horaEntradaRef || "09:00").split(":").map((n) => parseInt(n, 10) || 0);
    const refHHMM = `${String(hhRef).padStart(2, "0")}:${String(mmRef).padStart(2, "0")}`;
    const entradaRefMs = new Date(`${fecha}T${refHHMM}:00-03:00`).getTime();

    // Recortar: si fichó antes de la referencia, contar desde la referencia.
    const entradaEfectivaMs = Math.max(entradaRealMs, entradaRefMs);
    const ms = salidaMs - entradaEfectivaMs;
    if (ms <= 0) continue;
    const brutasHs = ms / (1000 * 60 * 60);

    const arg = toArgentinaTime(entrada.timestamp_real);
    const dow = arg.getUTCDay();
    const esDomingo = dow === 0;
    const baseHs = esDomingo ? config.baseDomingoHs : config.baseHabilHs;
    const extraHsBruto = Math.max(0, brutasHs - baseHs);
    const extraMin = extraHsBruto * 60;
    const extraConTolerancia = extraMin >= config.toleranciaMin ? extraHsBruto : 0;
    const extraHs = aplicarRedondeo(extraConTolerancia, config);

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
      extraHsBruto,
    });
  }

  jornadas.sort((a, b) => (a.fecha === b.fecha ? a.empleadoNombre.localeCompare(b.empleadoNombre) : a.fecha.localeCompare(b.fecha)));
  return jornadas;
}

export function calcularResumen(
  jornadas: JornadaCalculada[],
  config: ConfigHorasExtras = DEFAULT_CONFIG_HE
): ResumenEmpleado[] {
  const map = new Map<string, ResumenEmpleado>();
  for (const j of jornadas) {
    if (!map.has(j.empleadoId)) {
      map.set(j.empleadoId, {
        empleadoNombre: j.empleadoNombre,
        hsExtraHabil: 0,
        hsExtraDomingo: 0,
        totalDomingo: 0,
        montoHabil: 0,
        montoDomingo: 0,
        montoTotal: 0,
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
  for (const r of map.values()) {
    r.montoHabil = r.hsExtraHabil * config.valorHoraHabil;
    r.montoDomingo = r.hsExtraDomingo * config.valorHoraDomingo;
    r.montoTotal = r.montoHabil + r.montoDomingo;
  }
  return Array.from(map.values()).sort((a, b) => a.empleadoNombre.localeCompare(b.empleadoNombre));
}

const fmtHs = (h: number) => {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}h ${mm.toString().padStart(2, "0")}m`;
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n || 0);

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
  config: ConfigHorasExtras;
}) {
  const { fichajes, sucursales, fechaDesde, fechaHasta, sucursalLabel, empleadosLabel, config } = opts;

  const jornadas = calcularJornadas(fichajes, sucursales, config);
  const detalle = jornadas.filter((j) => j.extraHs > 0);
  const resumen = calcularResumen(jornadas, config);

  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(PDF_STYLES.colors.primary);
  doc.rect(0, 0, pageW, 30, "F");
  const logo = await loadLogo();
  if (logo) {
    try { doc.addImage(logo, "JPEG", margin, 6, 16, 16); } catch {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Liquidación de Horas Extras", margin + 20, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${fmtFecha(fechaDesde)} – ${fmtFecha(fechaHasta)}`, margin + 20, 18);
  doc.text(`Sucursal: ${sucursalLabel}    Empleados: ${empleadosLabel}`, margin + 20, 23);
  const redondeoTxt = config.redondeoMin > 0
    ? ` · Redondeo: ${config.redondeoMin}min (umbral ${config.redondeoUmbralMin}min)`
    : "";
  doc.text(
    `Hábil: ${fmtMoney(config.valorHoraHabil)}/h · Domingo: ${fmtMoney(config.valorHoraDomingo)}/h · Tolerancia: ${config.toleranciaMin}min${redondeoTxt}`,
    margin + 20,
    28
  );

  doc.setTextColor(PDF_STYLES.colors.text);

  let y = 38;

  // Resumen primero (lo más importante para tesorería)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen por empleado", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [["Empleado", "Hs hábil", "$ hábil", "Hs domingo", "$ domingo", "TOTAL $"]],
    body: resumen.map((r) => [
      r.empleadoNombre,
      fmtHs(r.hsExtraHabil),
      fmtMoney(r.montoHabil),
      fmtHs(r.hsExtraDomingo),
      fmtMoney(r.montoDomingo),
      fmtMoney(r.montoTotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [149, 25, 141], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      2: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  const totalHabilHs = resumen.reduce((a, b) => a + b.hsExtraHabil, 0);
  const totalDomHs = resumen.reduce((a, b) => a + b.hsExtraDomingo, 0);
  const totalHabil$ = resumen.reduce((a, b) => a + b.montoHabil, 0);
  const totalDom$ = resumen.reduce((a, b) => a + b.montoDomingo, 0);
  const granTotal = totalHabil$ + totalDom$;

  y = (doc as any).lastAutoTable.finalY + 5;

  // Caja de TOTAL A PAGAR
  doc.setFillColor(75, 13, 109);
  doc.rect(margin, y, pageW - margin * 2, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Totales — Hs hábil: ${fmtHs(totalHabilHs)}   Hs domingo: ${fmtHs(totalDomHs)}`,
    margin + 3,
    y + 5.5
  );
  doc.setFontSize(13);
  doc.text(`TOTAL A PAGAR: ${fmtMoney(granTotal)}`, pageW - margin - 3, y + 10, { align: "right" });

  y += 20;
  doc.setTextColor(PDF_STYLES.colors.text);

  // Detalle
  if (detalle.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de jornadas con extras", margin, y);
    y += 3;

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
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Firmas
  if (y > 250) { doc.addPage(); y = 30; }
  y = Math.max(y, 250);
  doc.setDrawColor(150);
  doc.line(margin + 10, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin - 10, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Firma RRHH", margin + 40, y + 4, { align: "center" });
  doc.text("Firma Tesorería", pageW - margin - 40, y + 4, { align: "center" });

  const fileName = `liquidacion_horas_extras_${fechaDesde}_${fechaHasta}.pdf`;
  doc.save(fileName);
}
