import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { PDF_STYLES, COMPANY_INFO } from "./pdfStyles";
import type { ResumenEmpleado } from "@/pages/NovedadesLiquidacion";
import type { FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";

export function exportNovedadesPDF(resumen: ResumenEmpleado[], desde: string, hasta: string, feriados: FeriadoTrabajadoRow[] = []) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(PDF_STYLES.colors.primary);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Novedades para Liquidación de Sueldos", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY_INFO.name} · ${format(new Date(desde + "T00:00:00"), "dd/MM/yyyy")} al ${format(new Date(hasta + "T00:00:00"), "dd/MM/yyyy")}`, 14, 19);

  autoTable(doc, {
    startY: 28,
    head: [["Empleado", "Sucursal", "Esp.", "Trab.", "Fer.", "Vac.", "Lic.M.", "Otras", "NO FICH.", "Hs esp.", "Hs trab."]],
    body: resumen.map(e => [
      e.nombre + (e.legajo ? ` (#${e.legajo})` : ""),
      e.sucursal || "—",
      e.dias_esperados,
      e.trabajados,
      e.feriados || "—",
      e.vacaciones || "—",
      e.lic_medica || "—",
      e.otras_licencias || "—",
      e.no_fichadas > 0 ? { content: String(e.no_fichadas), styles: { textColor: "#ffffff", fillColor: PDF_STYLES.colors.danger, fontStyle: "bold" } } : "—",
      e.horas_esperadas.toFixed(1),
      e.horas_trabajadas.toFixed(1),
    ]),
    headStyles: { fillColor: PDF_STYLES.colors.secondary, textColor: "#ffffff", fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: "#f8f5fa" },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35 } },
  });

  // Detalle de NO FICHADAS
  const noFichadas = resumen.flatMap(e => e.rows.filter(r => r.estado === "NO_FICHADA").map(r => ({ e, r })));
  if (noFichadas.length) {
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(PDF_STYLES.colors.danger);
    doc.setFont("helvetica", "bold");
    doc.text(`No fichadas sin justificar (${noFichadas.length})`, 14, y);

    autoTable(doc, {
      startY: y + 3,
      head: [["Empleado", "Fecha", "Sucursal", "Turno", "Hs esperadas"]],
      body: noFichadas.map(({ e, r }) => [
        e.nombre, format(new Date(r.fecha + "T00:00:00"), "dd/MM/yyyy"),
        e.sucursal || "—", r.turno_nombre || "—", Number(r.horas_esperadas).toFixed(1),
      ]),
      headStyles: { fillColor: PDF_STYLES.colors.danger, textColor: "#ffffff", fontSize: 9 },
      bodyStyles: { fontSize: 8 },
    });
  }

  // Feriados trabajados
  if (feriados.length) {
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(PDF_STYLES.colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text(`Feriados trabajados (${feriados.length})`, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Fecha", "Feriado", "Empleado", "Sucursal", "Entrada", "Salida", "Hs"]],
      body: feriados.map(f => [
        format(new Date(f.fecha + "T00:00:00"), "dd/MM/yyyy"),
        f.feriado_nombre,
        `${f.empleado_apellido}, ${f.empleado_nombre}` + (f.empleado_legajo ? ` (#${f.empleado_legajo})` : ""),
        f.sucursal_nombre || "—",
        f.hora_entrada?.slice(0, 5) || "—",
        f.hora_salida?.slice(0, 5) || "—",
        Number(f.horas_trabajadas).toFixed(2),
      ]),
      headStyles: { fillColor: PDF_STYLES.colors.primary, textColor: "#ffffff", fontSize: 9 },
      bodyStyles: { fontSize: 8 },
    });
  }

  doc.save(`novedades-liquidacion-${desde}-a-${hasta}.pdf`);
}
