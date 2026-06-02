import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_INFO } from "./pdfStyles";

export interface EventoInforme {
  tipo_evento: "llegada_tarde" | "ausencia";
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  sucursal_nombre: string | null;
  fecha: string;
  minutos_retraso: number | null;
  hora_programada: string | null;
  hora_real: string | null;
  categoria_nombre: string | null;
  categoria_color: string | null;
  es_justificada: boolean | null;
  observacion: string | null;
}

const loadLogo = (): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/jpeg"));
    };
    img.onerror = () => resolve(null);
    img.src = COMPANY_INFO.logo;
  });

const fmtFecha = (s: string) => format(new Date(s + "T12:00:00"), "dd/MM/yyyy", { locale: es });

export async function generarInformeAsistenciaPDF(
  eventos: EventoInforme[],
  desde: string,
  hasta: string,
  alcance: string,
) {
  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = await loadLogo();

  // ---------- PORTADA / RESUMEN ----------
  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pageW, 45, "F");
  if (logo) doc.addImage(logo, "JPEG", 14, 8, 30, 30);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20).setFont("helvetica", "bold");
  doc.text("INFORME DE ASISTENCIA", logo ? 50 : 14, 22);
  doc.setFontSize(11).setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.fullName, logo ? 50 : 14, 30);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, logo ? 50 : 14, 37);

  // Card de período
  let y = 55;
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(14, y, pageW - 28, 22, 3, 3, "F");
  doc.setTextColor(75, 13, 109).setFontSize(11).setFont("helvetica", "bold");
  doc.text("Período:", 18, y + 9);
  doc.text("Alcance:", 18, y + 17);
  doc.setFont("helvetica", "normal").setTextColor(39, 44, 77);
  doc.text(`${fmtFecha(desde)} al ${fmtFecha(hasta)}`, 40, y + 9);
  doc.text(alcance, 40, y + 17);

  // KPIs
  const tardes = eventos.filter(e => e.tipo_evento === "llegada_tarde");
  const ausencias = eventos.filter(e => e.tipo_evento === "ausencia");
  const justificados = eventos.filter(e => e.es_justificada === true).length;
  const sinJust = eventos.length - justificados;
  const minutosTotales = tardes.reduce((s, e) => s + (e.minutos_retraso || 0), 0);
  const empleadosUnicos = new Set(eventos.map(e => `${e.empleado_apellido} ${e.empleado_nombre}`)).size;

  y = 85;
  doc.setFillColor(75, 13, 109);
  doc.rect(14, y, pageW - 28, 8, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(12);
  doc.text("RESUMEN EJECUTIVO", 18, y + 6);

  autoTable(doc, {
    startY: y + 12,
    theme: "plain",
    body: [
      ["Empleados involucrados", `${empleadosUnicos}`],
      ["Llegadas tarde", `${tardes.length}`],
      ["Ausencias", `${ausencias.length}`],
      ["Justificadas", `${justificados}`],
      ["Sin justificar", `${sinJust}`],
      ["Minutos acumulados de retraso", `${minutosTotales} min (${(minutosTotales / 60).toFixed(1)} h)`],
      ["% justificación", eventos.length ? `${Math.round(justificados * 100 / eventos.length)}%` : "—"],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 90, textColor: [39, 44, 77] },
      1: { halign: "center", textColor: [75, 13, 109], fontStyle: "bold" },
    },
    margin: { left: 20, right: 14 },
  });

  // Ranking sin justificar
  const ranking = new Map<string, number>();
  eventos.filter(e => !e.es_justificada).forEach(e => {
    const k = `${e.empleado_apellido}, ${e.empleado_nombre}${e.empleado_legajo ? ` (#${e.empleado_legajo})` : ""}`;
    ranking.set(k, (ranking.get(k) || 0) + 1);
  });
  const top = [...ranking.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (top.length) {
    const yRank = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(149, 25, 141);
    doc.rect(14, yRank, pageW - 28, 7, "F");
    doc.setTextColor(255, 255, 255).setFontSize(11).setFont("helvetica", "bold");
    doc.text("TOP EMPLEADOS CON EVENTOS SIN JUSTIFICAR", 18, yRank + 5);
    autoTable(doc, {
      startY: yRank + 10,
      head: [["Empleado", "Eventos sin justificar"]],
      body: top.map(([k, v]) => [k, `${v}`]),
      headStyles: { fillColor: [224, 68, 3], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
    });
  }

  // Desglose por categoría
  const porCat = new Map<string, number>();
  eventos.forEach(e => {
    const k = e.categoria_nombre || "(Pendiente de revisar)";
    porCat.set(k, (porCat.get(k) || 0) + 1);
  });
  if (porCat.size) {
    const yCat = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: yCat,
      head: [["Categoría", "Cantidad", "%"]],
      body: [...porCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, `${v}`, `${Math.round(v * 100 / eventos.length)}%`]),
      headStyles: { fillColor: [75, 13, 109], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
      margin: { left: 14, right: 14 },
    });
  }

  // ---------- ANEXO DETALLADO ----------
  doc.addPage();
  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(12);
  doc.text("ANEXO — DETALLE COMPLETO DE EVENTOS", 14, 12);

  const sorted = [...eventos].sort((a, b) => {
    const ap = `${a.empleado_apellido} ${a.empleado_nombre}`;
    const bp = `${b.empleado_apellido} ${b.empleado_nombre}`;
    if (ap !== bp) return ap.localeCompare(bp);
    return a.fecha.localeCompare(b.fecha);
  });

  autoTable(doc, {
    startY: 24,
    head: [["Empleado", "Sucursal", "Fecha", "Tipo", "Detalle", "Categoría", "Observación"]],
    body: sorted.map(e => [
      `${e.empleado_apellido}, ${e.empleado_nombre}${e.empleado_legajo ? `\n#${e.empleado_legajo}` : ""}`,
      e.sucursal_nombre || "—",
      fmtFecha(e.fecha),
      e.tipo_evento === "llegada_tarde" ? "Llegada tarde" : "Ausencia",
      e.tipo_evento === "llegada_tarde"
        ? `${e.minutos_retraso} min (${(e.hora_programada || "").slice(0, 5)} → ${(e.hora_real || "").slice(0, 5)})`
        : "Sin fichaje",
      e.categoria_nombre || "Pendiente",
      e.observacion || "",
    ]),
    headStyles: { fillColor: [149, 25, 141], textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      2: { cellWidth: 18 },
      3: { cellWidth: 20 },
      4: { cellWidth: 32 },
      5: { cellWidth: 28 },
      6: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index >= 0) {
        const ev = sorted[data.row.index];
        if (ev && ev.es_justificada === false) {
          data.cell.styles.fillColor = [253, 230, 218];
        } else if (ev && ev.categoria_nombre == null) {
          data.cell.styles.fillColor = [255, 247, 219];
        }
      }
    },
    margin: { left: 8, right: 8 },
  });

  // Footer paginación
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7).setTextColor(150, 150, 150).setFont("helvetica", "normal");
    doc.text(
      `${COMPANY_INFO.fullName} — Documento confidencial — Página ${i} de ${total}`,
      pageW / 2, pageH - 6, { align: "center" },
    );
  }

  doc.save(`informe_asistencia_${desde}_${hasta}.pdf`);
}
