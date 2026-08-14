import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_INFO } from "./pdfStyles";
import { calcularPatrones, type ContextoPatrones } from "@/components/ausentismo/analisis";
import { DIAS_LABEL, type FilaEmpleado } from "@/components/ausentismo/types";

const labelMes = (m: string) => format(new Date(m + "-01T00:00:00"), "MMM yy", { locale: es });

export function exportIndiceAusentismoXLSX(
  filas: FilaEmpleado[],
  mesesOrden: string[],
  ctx: ContextoPatrones,
  desde: string,
  hasta: string,
) {
  const wb = XLSX.utils.book_new();

  const matriz = filas.map((f) => {
    const row: Record<string, string | number> = {
      Legajo: f.legajo || "",
      Empleado: f.nombre,
      Sucursal: f.sucursal_nombre || "",
    };
    mesesOrden.forEach((m) => {
      const c = f.meses[m];
      row[labelMes(m)] = c?.esperados ? Number(c.indice.toFixed(1)) : "";
    });
    row["Índice período %"] = Number(f.total.indice.toFixed(1));
    row["Ausencias"] = f.total.ausentes;
    row["Días esperados"] = f.total.esperados;
    row["Justificadas"] = f.total.justificadas;
    row["Sin justificar"] = f.total.sinJustificar;
    row["Tendencia (pp)"] = Number(f.tendencia.toFixed(1));
    row["Alertas"] = f.alertas.join(" | ");
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matriz), "Matriz mensual");

  const detalle = filas.flatMap((f) =>
    f.ausencias
      .slice()
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((a) => ({
        Legajo: f.legajo || "",
        Empleado: f.nombre,
        Sucursal: f.sucursal_nombre || "",
        Fecha: a.fecha,
        Día: DIAS_LABEL[a.dia_semana],
        Motivo: a.categoria_nombre || "Sin justificar",
        Justificada: a.es_justificada ? "Sí" : "No",
        Observación: a.observacion || "",
      })),
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle diario");

  const patrones = filas.map((f) => {
    const p = calcularPatrones(f, mesesOrden, ctx);
    const topDia = p.porDiaSemana.slice().sort((a, b) => b.cantidad - a.cantidad)[0];
    return {
      Legajo: f.legajo || "",
      Empleado: f.nombre,
      Ausencias: f.ausencias.length,
      "Día más frecuente": topDia?.cantidad ? DIAS_LABEL[topDia.dia] : "",
      "En feriados/vísperas": p.diasClave,
      "Con vacaciones de otros": p.conVacacionesDeOtros,
      "Coincide con": p.coincidenciasVacaciones
        .slice(0, 5)
        .map((c) => `${c.nombre}${c.es_encargado ? " (encargado)" : ""}: ${c.cantidad}`)
        .join(" | "),
      "Racha máxima": p.rachaMax,
      "Meses sobre promedio": p.mesesSobrePromedio,
      Motivos: p.porCategoria.map((c) => `${c.nombre}: ${c.cantidad}`).join(" | "),
      Alertas: f.alertas.join(" | "),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patrones), "Patrones");

  XLSX.writeFile(wb, `indice_ausentismo_${desde}_${hasta}.xlsx`);
}

export function exportIndiceAusentismoPDF(
  filas: FilaEmpleado[],
  mesesOrden: string[],
  desde: string,
  hasta: string,
  alcance: string,
) {
  const doc = new jsPDF({ format: "a4", orientation: "landscape", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(14);
  doc.text("ÍNDICE DE AUSENTISMO POR EMPLEADO Y MES", 12, 10);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(
    `${COMPANY_INFO.fullName} · ${format(new Date(desde + "T00:00:00"), "dd/MM/yyyy")} al ${format(
      new Date(hasta + "T00:00:00"),
      "dd/MM/yyyy",
    )} · ${alcance}`,
    12,
    17,
  );

  autoTable(doc, {
    startY: 27,
    head: [["Empleado", ...mesesOrden.map(labelMes), "Período", "Aus./Esp.", "S/just.", "Alertas"]],
    body: filas.map((f) => [
      f.nombre,
      ...mesesOrden.map((m) => (f.meses[m]?.esperados ? `${f.meses[m].indice.toFixed(0)}%` : "—")),
      `${f.total.indice.toFixed(1)}%`,
      `${f.total.ausentes}/${f.total.esperados}`,
      `${f.total.sinJustificar}`,
      f.alertas.join(", "),
    ]),
    headStyles: { fillColor: [149, 25, 141], textColor: [255, 255, 255], fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 1.4, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 42 } },
    margin: { left: 8, right: 8 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const raw = String(data.cell.raw || "");
        const n = parseFloat(raw);
        if (raw.endsWith("%") && !isNaN(n)) {
          if (n >= 20) data.cell.styles.fillColor = [253, 205, 205];
          else if (n >= 10) data.cell.styles.fillColor = [253, 235, 205];
          else if (n > 0) data.cell.styles.fillColor = [226, 245, 232];
        }
      }
    },
  });

  const top = filas.slice(0, 10);
  if (top.length) {
    const y = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: y > pageH - 40 ? undefined : y,
      head: [["Ranking", "Empleado", "Índice", "Ausencias", "Sin justificar", "Alertas"]],
      body: top.map((f, i) => [
        `${i + 1}`,
        f.nombre,
        `${f.total.indice.toFixed(1)}%`,
        `${f.total.ausentes}`,
        `${f.total.sinJustificar}`,
        f.alertas.join(", "),
      ]),
      headStyles: { fillColor: [224, 68, 3], textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.6 },
      margin: { left: 8, right: 8 },
    });
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7).setTextColor(150, 150, 150);
    doc.text(
      `${COMPANY_INFO.fullName} — Documento confidencial — Página ${i} de ${total}`,
      pageW / 2,
      pageH - 5,
      { align: "center" },
    );
  }

  doc.save(`indice_ausentismo_${desde}_${hasta}.pdf`);
}
