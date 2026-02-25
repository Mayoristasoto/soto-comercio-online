import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_STYLES, COMPANY_INFO } from "./pdfStyles";

interface BranchRow {
  nombre: string;
  facturacion: number;
  gastos: number;
  costoLaboral: number;
  resultado: number;
  margen: number;
}

interface PdfParams {
  periodoLabel: string;
  rows: BranchRow[];
  totals: { facturacion: number; gastos: number; costoLaboral: number; resultado: number };
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function exportRentabilidadPDF({ periodoLabel, rows, totals }: PdfParams) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pw, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_STYLES.fonts.heading);
  doc.setFont("helvetica", "bold");
  doc.text("Informe de Rentabilidad por Sucursal", 20, 15);
  doc.setFontSize(PDF_STYLES.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoLabel}`, 20, 23);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-AR")}`, 20, 30);

  y = 45;

  // KPI Summary
  doc.setTextColor(39, 44, 77);
  doc.setFontSize(PDF_STYLES.fonts.subheading);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Ejecutivo", 20, y);
  y += 8;

  const kpis = [
    ["Facturación Total", fmt(totals.facturacion)],
    ["Gastos Totales", fmt(totals.gastos)],
    ["Costo Laboral", fmt(totals.costoLaboral)],
    ["Resultado Operativo", fmt(totals.resultado)],
    ["Margen Operativo", totals.facturacion > 0 ? pct(totals.resultado / totals.facturacion) : "-"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: kpis,
    theme: "grid",
    headStyles: { fillColor: [75, 13, 109], textColor: 255, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 20, right: 20 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Branch comparison table
  doc.setFontSize(PDF_STYLES.fonts.subheading);
  doc.setFont("helvetica", "bold");
  doc.text("Comparativa por Sucursal", 20, y);
  y += 8;

  const tableRows = rows.map((r) => [
    r.nombre,
    fmt(r.facturacion),
    fmt(r.gastos),
    fmt(r.costoLaboral),
    fmt(r.resultado),
    pct(r.margen),
  ]);

  tableRows.push([
    "TOTAL",
    fmt(totals.facturacion),
    fmt(totals.gastos),
    fmt(totals.costoLaboral),
    fmt(totals.resultado),
    totals.facturacion > 0 ? pct(totals.resultado / totals.facturacion) : "-",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Sucursal", "Facturación", "Gastos", "C. Laboral", "Resultado", "Margen"]],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [149, 25, 141], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      // Bold total row
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`${COMPANY_INFO.fullName} — Confidencial`, 20, ph - 10);

  doc.save(`rentabilidad_${periodoLabel.replace(/\s/g, "_")}.pdf`);
}
