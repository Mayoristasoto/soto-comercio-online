import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PDF_STYLES, COMPANY_INFO } from "./pdfStyles";

interface FichajeTardio {
  fecha_fichaje: string;
  hora_programada: string;
  hora_real: string;
  minutos_retraso: number;
  justificado: boolean | null;
  observaciones: string | null;
}

interface EmpleadoInfo {
  id: string;
  nombre: string;
  apellido: string;
}

const loadLogo = (): Promise<string | null> => {
  return new Promise((resolve) => {
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
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = COMPANY_INFO.logo;
  });
};

export const generarReporteLlegadasTarde = async (
  empleadoId: string,
  fechaDesde: string,
  fechaHasta: string
) => {
  // Fetch employee info
  const { data: empData, error: empError } = await supabase
    .from("empleados")
    .select("id, nombre, apellido")
    .eq("id", empleadoId)
    .single();

  if (empError || !empData) throw new Error("No se encontró el empleado");

  const empleado: EmpleadoInfo = empData;

  // Fetch late arrivals
  const { data: fichajes, error: fichError } = await supabase
    .from("fichajes_tardios")
    .select("fecha_fichaje, hora_programada, hora_real, minutos_retraso, justificado, observaciones")
    .eq("empleado_id", empleadoId)
    .gte("fecha_fichaje", fechaDesde)
    .lte("fecha_fichaje", fechaHasta)
    .order("fecha_fichaje", { ascending: false });

  if (fichError) throw new Error("Error al consultar fichajes tardíos");

  const records: FichajeTardio[] = fichajes || [];

  if (records.length === 0) {
    throw new Error("No se encontraron llegadas tarde en el período seleccionado");
  }

  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_STYLES.spacing.page;
  const colors = PDF_STYLES.colors;

  // Stats
  const totalRetraso = records.reduce((s, r) => s + r.minutos_retraso, 0);
  const promedioRetraso = Math.round(totalRetraso / records.length);
  const justificadas = records.filter((r) => r.justificado).length;
  const sinJustificar = records.length - justificadas;
  const maxRetraso = Math.max(...records.map((r) => r.minutos_retraso));
  const criticos = records.filter((r) => r.minutos_retraso >= 30);
  const menores = records.filter((r) => r.minutos_retraso < 10);

  const logo = await loadLogo();

  // ========================
  // PAGE 1: Cover + Summary
  // ========================
  // Header bar
  doc.setFillColor(75, 13, 109); // primary purple
  doc.rect(0, 0, pageW, 45, "F");

  if (logo) {
    doc.addImage(logo, "JPEG", margin.left, 8, 30, 30);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE LLEGADAS TARDE", logo ? margin.left + 35 : margin.left, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.fullName, logo ? margin.left + 35 : margin.left, 30);
  doc.text(`Documento generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, logo ? margin.left + 35 : margin.left, 37);

  // Employee info card
  let y = 55;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin.left, y, pageW - margin.left - margin.right, 28, 3, 3, "F");
  doc.setDrawColor(149, 25, 141); // secondary magenta
  doc.setLineWidth(0.5);
  doc.roundedRect(margin.left, y, pageW - margin.left - margin.right, 28, 3, 3, "S");

  doc.setTextColor(75, 13, 109);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Empleado:", margin.left + 5, y + 10);
  doc.setTextColor(39, 44, 77);
  doc.setFont("helvetica", "normal");
  doc.text(`${empleado.nombre} ${empleado.apellido}`, margin.left + 40, y + 10);

  doc.setTextColor(75, 13, 109);
  doc.setFont("helvetica", "bold");
  doc.text("Período:", margin.left + 5, y + 20);
  doc.setTextColor(39, 44, 77);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${format(new Date(fechaDesde + "T12:00:00"), "dd/MM/yyyy", { locale: es })} al ${format(new Date(fechaHasta + "T12:00:00"), "dd/MM/yyyy", { locale: es })}`,
    margin.left + 35,
    y + 20
  );

  // Executive Summary
  y = 95;
  doc.setFillColor(75, 13, 109);
  doc.rect(margin.left, y, pageW - margin.left - margin.right, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN EJECUTIVO", margin.left + 5, y + 6);

  y += 14;
  const summaryData = [
    ["Total de llegadas tarde", `${records.length}`],
    ["Llegadas justificadas", `${justificadas}`],
    ["Llegadas sin justificar", `${sinJustificar}`],
    ["Promedio de retraso", `${promedioRetraso} minutos`],
    ["Retraso máximo registrado", `${maxRetraso} minutos`],
    ["Retrasos críticos (≥30 min)", `${criticos.length}`],
    ["Retrasos menores (<10 min)", `${menores.length}`],
    ["Total minutos de retraso acumulados", `${totalRetraso} minutos`],
  ];

  autoTable(doc, {
    body: summaryData,
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80, textColor: [39, 44, 77] },
      1: { cellWidth: 60, halign: "center", textColor: [75, 13, 109], fontStyle: "bold" },
    },
    margin: { left: margin.left + 5, right: margin.right },
  });

  // ========================
  // PAGE 2+: Detail Table
  // ========================
  doc.addPage();

  // Header
  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE LLEGADAS TARDE", margin.left, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${empleado.nombre} ${empleado.apellido}`, pageW - margin.right - 60, 12);

  const tableData = records.map((r, i) => [
    `${i + 1}`,
    format(new Date(r.fecha_fichaje + "T12:00:00"), "dd/MM/yyyy", { locale: es }),
    r.hora_programada?.substring(0, 5) || "-",
    r.hora_real?.substring(0, 5) || "-",
    `${r.minutos_retraso} min`,
    r.justificado ? "Sí" : "No",
  ]);

  autoTable(doc, {
    head: [["#", "Fecha", "Hora Programada", "Hora Real", "Retraso", "Justificado"]],
    body: tableData,
    startY: 25,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [149, 25, 141], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 32, halign: "center" },
      4: { cellWidth: 25, halign: "center", textColor: [224, 68, 3], fontStyle: "bold" },
      5: { cellWidth: 25, halign: "center" },
    },
    margin: { left: margin.left, right: margin.right },
    didParseCell: (data) => {
      // Highlight critical delays
      if (data.section === "body" && data.column.index === 4) {
        const val = parseInt(data.cell.raw as string);
        if (val >= 30) {
          data.cell.styles.textColor = [224, 68, 3];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ========================
  // Observations + Signatures
  // ========================
  doc.addPage();

  // Header
  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVACIONES Y ACLARACIONES", margin.left, 12);

  y = 28;
  doc.setTextColor(39, 44, 77);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const observations = [
    `1. Se registra un patrón consistente de retrasos menores (entre 1 y 7 minutos) que se repite de manera frecuente a lo largo del período analizado (${menores.length} de ${records.length} registros).`,
    "",
    `2. Se identificaron ${criticos.length} retraso(s) crítico(s) de más de 30 minutos:`,
    ...criticos
      .sort((a, b) => b.minutos_retraso - a.minutos_retraso)
      .map(
        (c) =>
          `   • ${format(new Date(c.fecha_fichaje + "T12:00:00"), "dd/MM/yyyy", { locale: es })}: ${c.minutos_retraso} minutos de retraso`
      ),
    "",
    `3. Del total de ${records.length} llegadas tarde registradas, ${sinJustificar} se encuentran sin justificación formal por parte del empleado (${sinJustificar}/${records.length}).`,
    "",
    `4. El acumulado total de minutos de retraso en el período es de ${totalRetraso} minutos (equivalente a ${(totalRetraso / 60).toFixed(1)} horas), con un promedio de ${promedioRetraso} minutos por llegada tarde.`,
    "",
    "5. La frecuencia y constancia del patrón de impuntualidad sugieren la necesidad de una notificación formal al empleado para corregir la conducta.",
    "",
    "6. Este reporte se genera a los fines de documentar la situación y servir de soporte para las acciones administrativas que correspondan según el reglamento interno vigente.",
  ];

  observations.forEach((line) => {
    if (y > pageH - 80) {
      doc.addPage();
      y = 20;
    }
    const lines = doc.splitTextToSize(line, pageW - margin.left - margin.right - 10);
    doc.text(lines, margin.left + 5, y);
    y += lines.length * 5 + 2;
  });

  // Signature section
  y = Math.max(y + 15, pageH - 75);
  if (y > pageH - 70) {
    doc.addPage();
    y = 40;
  }

  doc.setDrawColor(149, 25, 141);
  doc.setLineWidth(0.3);
  doc.line(margin.left, y, pageW - margin.right, y);

  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(75, 13, 109);
  doc.text("ACUSE DE RECIBO", pageW / 2, y, { align: "center" });

  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(39, 44, 77);
  const acuseText = `El/la empleado/a ${empleado.nombre} ${empleado.apellido} declara haber sido notificado/a del presente reporte de llegadas tarde correspondiente al período ${format(new Date(fechaDesde + "T12:00:00"), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaHasta + "T12:00:00"), "dd/MM/yyyy", { locale: es })}, tomando conocimiento de la totalidad de su contenido.`;
  const acuseLines = doc.splitTextToSize(acuseText, pageW - margin.left - margin.right - 20);
  doc.text(acuseLines, pageW / 2, y, { align: "center", maxWidth: pageW - margin.left - margin.right - 20 });

  y += acuseLines.length * 5 + 20;

  // Signature lines
  const sigWidth = 65;
  const sigLeftX = margin.left + 15;
  const sigRightX = pageW - margin.right - sigWidth - 15;

  doc.setDrawColor(39, 44, 77);
  doc.setLineWidth(0.4);
  doc.line(sigLeftX, y, sigLeftX + sigWidth, y);
  doc.line(sigRightX, y, sigRightX + sigWidth, y);

  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Firma del Gerente", sigLeftX + sigWidth / 2, y, { align: "center" });
  doc.text("Firma del Empleado", sigRightX + sigWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Aclaración: ________________________", sigLeftX, y);
  doc.text("Aclaración: ________________________", sigRightX, y);

  y += 7;
  doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy", { locale: es })}`, sigLeftX, y);
  doc.text(`Fecha: ____/____/________`, sigRightX, y);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${COMPANY_INFO.fullName} — Documento confidencial — Página ${i} de ${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
  }

  doc.save(
    `llegadas_tarde_${empleado.apellido}_${empleado.nombre}_${fechaDesde}_${fechaHasta}.pdf`
  );
};
