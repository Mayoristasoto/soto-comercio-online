import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

export interface ComprobanteVacacionesData {
  empleado: {
    nombre: string;
    apellido: string;
    email?: string | null;
    dni?: string | null;
    puesto?: string | null;
    sucursal?: string | null;
    fecha_ingreso?: string | null;
  };
  solicitud: {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    motivo?: string | null;
    comentarios_aprobacion?: string | null;
  };
  aprobador?: {
    nombre: string;
    apellido: string;
  } | null;
  fecha_aprobacion: string;
}

const PRIMARY = "#4b0d6d";
const SECONDARY = "#95198d";
const ACCENT = "#e04403";

export function generarComprobanteVacacionesPDF(d: ComprobanteVacacionesData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;

  const fi = parseISO(d.solicitud.fecha_inicio);
  const ff = parseISO(d.solicitud.fecha_fin);
  const dias = differenceInCalendarDays(ff, fi) + 1;
  const reintegro = new Date(ff);
  reintegro.setDate(reintegro.getDate() + 1);

  // Header bar
  doc.setFillColor(PRIMARY);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("COMPROBANTE DE VACACIONES", pageW / 2, 9, { align: "center" });

  y = 24;
  doc.setTextColor("#000000");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`N° solicitud: ${d.solicitud.id.slice(0, 8).toUpperCase()}`, 15, y);
  doc.text(
    `Emitido: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    pageW - 15,
    y,
    { align: "right" }
  );

  y += 6;
  doc.setDrawColor(SECONDARY);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageW - 15, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY);
  doc.text("Datos del empleado", 15, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 } },
    body: [
      ["Apellido y nombre:", `${d.empleado.apellido ?? ""}, ${d.empleado.nombre ?? ""}`],
      ["DNI:", d.empleado.dni ?? "—"],
      ["Puesto:", d.empleado.puesto ?? "—"],
      ["Sucursal:", d.empleado.sucursal ?? "—"],
      ["Fecha de ingreso:", d.empleado.fecha_ingreso ? format(parseISO(d.empleado.fecha_ingreso), "dd/MM/yyyy") : "—"],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY);
  doc.text("Período de vacaciones aprobado", 15, y);

  autoTable(doc, {
    startY: y + 3,
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: "#ffffff", fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5, halign: "center" },
    head: [["Desde", "Hasta", "Días corridos", "Se reintegra el"]],
    body: [
      [
        format(fi, "EEEE dd/MM/yyyy", { locale: es }),
        format(ff, "EEEE dd/MM/yyyy", { locale: es }),
        String(dias),
        format(reintegro, "EEEE dd/MM/yyyy", { locale: es }),
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  if (d.solicitud.motivo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    doc.text("Motivo / Observaciones del solicitante:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(d.solicitud.motivo, pageW - 30), 15, y);
    y += 8;
  }

  if (d.solicitud.comentarios_aprobacion) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Comentarios de la aprobación:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(d.solicitud.comentarios_aprobacion, pageW - 30), 15, y);
    y += 8;
  }

  // Notification box
  y += 2;
  doc.setFillColor("#fff7ed");
  doc.setDrawColor(ACCENT);
  doc.roundedRect(15, y, pageW - 30, 26, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(ACCENT);
  doc.text("Notificación al trabajador (Art. 154 LCT)", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#000000");
  doc.setFontSize(8.5);
  const txt =
    "Por la presente se notifica al trabajador la concesión y el período del descanso anual ordinario remunerado " +
    "según los datos consignados arriba. El trabajador deberá reintegrarse a sus tareas en la fecha indicada. " +
    "La firma al pie acredita su conocimiento y conformidad.";
  doc.text(doc.splitTextToSize(txt, pageW - 36), 18, y + 11);

  y += 34;

  // Firmas
  const firmaY = Math.max(y + 18, pageH - 50);
  doc.setDrawColor("#333333");
  doc.line(25, firmaY, 90, firmaY);
  doc.line(pageW - 90, firmaY, pageW - 25, firmaY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Firma y aclaración del empleado", 57.5, firmaY + 5, { align: "center" });
  doc.text("Firma y aclaración RRHH", pageW - 57.5, firmaY + 5, { align: "center" });
  doc.setFontSize(8);
  doc.text("DNI: ____________________", 57.5, firmaY + 10, { align: "center" });
  if (d.aprobador) {
    doc.text(
      `${d.aprobador.nombre} ${d.aprobador.apellido}`,
      pageW - 57.5,
      firmaY + 10,
      { align: "center" }
    );
  }
  doc.text(
    `Fecha aprobación: ${format(parseISO(d.fecha_aprobacion), "dd/MM/yyyy HH:mm")}`,
    pageW - 57.5,
    firmaY + 14,
    { align: "center" }
  );

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor("#888888");
  doc.text(
    `Comprobante generado automáticamente · ID ${d.solicitud.id}`,
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  doc.autoPrint();
  const blob = doc.output("bloburl");
  const w = window.open(blob as any, "_blank");
  if (!w) doc.save(`vacaciones_${d.empleado.apellido}_${format(fi, "yyyyMMdd")}.pdf`);
}
