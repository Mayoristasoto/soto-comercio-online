import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { PDF_STYLES, COMPANY_INFO } from "./pdfStyles";
import type { ResumenEmpleado } from "@/pages/NovedadesLiquidacion";
import type { FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";
import type { NovedadesExtras } from "./novedadesLiquidacionXLSX";

const money = (n: number) => "$ " + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

export function exportNovedadesPDF(
  resumen: ResumenEmpleado[],
  desde: string,
  hasta: string,
  feriados: FeriadoTrabajadoRow[] = [],
  extras: NovedadesExtras = {},
) {
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

  // Ausencias justificadas (informe gerencial)
  const justificadas = resumen.flatMap(e => e.rows.filter(r => r.estado === "AUSENCIA_JUSTIFICADA").map(r => ({ e, r })));
  if (justificadas.length) {
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(PDF_STYLES.colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.text(`Ausencias justificadas (${justificadas.length})`, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Empleado", "Fecha", "Sucursal", "Motivo", "Hs esperadas"]],
      body: justificadas.map(({ e, r }) => [
        e.nombre, format(new Date(r.fecha + "T00:00:00"), "dd/MM/yyyy"),
        e.sucursal || "—", r.detalle || "—", Number(r.horas_esperadas).toFixed(1),
      ]),
      headStyles: { fillColor: PDF_STYLES.colors.secondary, textColor: "#ffffff", fontSize: 9 },
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

  // Vacaciones del período
  const vacs = extras.vacaciones || [];
  if (vacs.length) {
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(PDF_STYLES.colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text(`Vacaciones en el período (${vacs.length})`, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Empleado", "Sucursal", "Desde", "Hasta", "Días", "Período dev.", "Estado"]],
      body: vacs.map(v => [
        v.empleado_nombre + (v.empleado_legajo ? ` (#${v.empleado_legajo})` : ""),
        v.sucursal_nombre || "—",
        format(new Date(v.fecha_inicio + "T00:00:00"), "dd/MM/yyyy"),
        format(new Date(v.fecha_fin + "T00:00:00"), "dd/MM/yyyy"),
        v.dias_en_periodo,
        v.periodo_devengado ?? "—",
        v.estado,
      ]),
      foot: [["", "", "", "Total días", vacs.reduce((a, v) => a + v.dias_en_periodo, 0), "", ""]],
      headStyles: { fillColor: PDF_STYLES.colors.primary, textColor: "#ffffff", fontSize: 9 },
      footStyles: { fillColor: "#f0eaf4", textColor: PDF_STYLES.colors.primary, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });
  }

  // Horas extras
  const hex = extras.horasExtras || [];
  if (hex.length) {
    const map = new Map<string, { nombre: string; suc: string; jor: number; hs: number; hsD: number; monto: number }>();
    for (const h of hex) {
      const k = h.empleado_id || h.empleado_nombre;
      let acc = map.get(k);
      if (!acc) { acc = { nombre: h.empleado_nombre, suc: h.sucursal_nombre || "—", jor: 0, hs: 0, hsD: 0, monto: 0 }; map.set(k, acc); }
      acc.jor++; acc.monto += Number(h.monto || 0);
      if (h.es_domingo) acc.hsD += Number(h.extra_hs || 0); else acc.hs += Number(h.extra_hs || 0);
    }
    const arr = [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(PDF_STYLES.colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.text(`Horas extras liquidadas (${hex.length} jornadas)`, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Empleado", "Sucursal", "Jornadas", "Hs hábiles", "Hs domingo", "Monto"]],
      body: arr.map(e => [e.nombre, e.suc, e.jor, e.hs.toFixed(1), e.hsD.toFixed(1), money(e.monto)]),
      foot: [["Totales", "", arr.reduce((a, e) => a + e.jor, 0),
        arr.reduce((a, e) => a + e.hs, 0).toFixed(1),
        arr.reduce((a, e) => a + e.hsD, 0).toFixed(1),
        money(arr.reduce((a, e) => a + e.monto, 0))]],
      headStyles: { fillColor: PDF_STYLES.colors.secondary, textColor: "#ffffff", fontSize: 9 },
      footStyles: { fillColor: "#f0eaf4", textColor: PDF_STYLES.colors.primary, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });
  }

  // Adelantos
  const ade = extras.adelantos || [];
  if (ade.length) {
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(PDF_STYLES.colors.accent || PDF_STYLES.colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text(`Adelantos de sueldo (${ade.length})`, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Fecha", "Empleado", "Sucursal", "Monto", "Estado", "Origen", "Observaciones"]],
      body: ade.map(a => [
        format(new Date(a.fecha_solicitud + "T00:00:00"), "dd/MM/yyyy"),
        a.empleado_nombre + (a.empleado_legajo ? ` (#${a.empleado_legajo})` : ""),
        a.sucursal_nombre || "—",
        money(a.monto),
        a.estado,
        a.origen,
        a.descripcion || "—",
      ]),
      foot: [["", "", "Total aprobado", money(ade.filter(a => a.estado === "aprobada").reduce((s, a) => s + Number(a.monto || 0), 0)), "", "", ""]],
      headStyles: { fillColor: PDF_STYLES.colors.primary, textColor: "#ffffff", fontSize: 9 },
      footStyles: { fillColor: "#f0eaf4", textColor: PDF_STYLES.colors.primary, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });
  }

  doc.save(`novedades-liquidacion-${desde}-a-${hasta}.pdf`);
}

