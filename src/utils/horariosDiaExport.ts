import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FilaDiaExport {
  empleado_id: string;
  nombre: string;
  sucursal_nombre: string;
  turno_nombre: string;
  entrada: string;
  salida: string;
  pausa: number;
  horas: number;
  origen: "real" | "modificado" | "provisorio";
}

export interface CoberturaHora {
  hora: string;
  cantidad: number;
  porSucursal: Record<string, number>;
}

const PRIMARY: [number, number, number] = [75, 13, 109];
const ACCENT: [number, number, number] = [224, 68, 3];

const ORIGEN_LABEL: Record<FilaDiaExport["origen"], string> = {
  real: "Real",
  modificado: "Modificado (provisorio)",
  provisorio: "Agregado (provisorio)",
};

function fechaLarga(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function exportDiaXLSX(
  fecha: string,
  filas: FilaDiaExport[],
  cobertura: CoberturaHora[],
  filtros: string
) {
  const wb = XLSX.utils.book_new();

  const info = [
    { Campo: "Fecha", Valor: fechaLarga(fecha) },
    { Campo: "Filtros", Valor: filtros },
    { Campo: "Empleados", Valor: filas.length },
    { Campo: "Horas programadas", Valor: Number(filas.reduce((a, f) => a + f.horas, 0).toFixed(2)) },
    { Campo: "Nota", Valor: "Documento informativo — no modifica los horarios asignados" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), "Info");

  const detalle = filas.map((f) => ({
    Sucursal: f.sucursal_nombre,
    Empleado: f.nombre,
    Turno: f.turno_nombre,
    Entrada: f.entrada,
    Salida: f.salida,
    "Pausa (min)": f.pausa,
    Horas: Number(f.horas.toFixed(2)),
    Origen: ORIGEN_LABEL[f.origen],
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle");

  const sucursales = [...new Set(filas.map((f) => f.sucursal_nombre))].sort();
  const cob = cobertura.map((c) => {
    const row: Record<string, string | number> = { Hora: c.hora, Total: c.cantidad };
    for (const s of sucursales) row[s] = c.porSucursal[s] ?? 0;
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cob), "Cobertura por hora");

  XLSX.writeFile(wb, `horarios-dia-${fecha}.xlsx`);
}

export function exportDiaPDF(
  fecha: string,
  filas: FilaDiaExport[],
  cobertura: CoberturaHora[],
  filtros: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Planificación del día", 14, 10);
  doc.setFontSize(10);
  doc.text(fechaLarga(fecha), 14, 17);
  doc.setFontSize(8);
  doc.text(filtros, w - 14, 17, { align: "right" });

  doc.setTextColor(...ACCENT);
  doc.setFontSize(8);
  doc.text("Documento informativo — no modifica los horarios asignados", 14, 28);

  const porSucursal = new Map<string, FilaDiaExport[]>();
  for (const f of filas) {
    if (!porSucursal.has(f.sucursal_nombre)) porSucursal.set(f.sucursal_nombre, []);
    porSucursal.get(f.sucursal_nombre)!.push(f);
  }

  let y = 33;
  for (const [suc, rows] of [...porSucursal.entries()].sort()) {
    autoTable(doc, {
      startY: y,
      head: [[`${suc} (${rows.length})`, "Turno", "Entrada", "Salida", "Pausa", "Horas", "Origen"]],
      body: rows.map((f) => [
        f.nombre,
        f.turno_nombre,
        f.entrada,
        f.salida,
        `${f.pausa} min`,
        f.horas.toFixed(2),
        ORIGEN_LABEL[f.origen],
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === "body" && rows[data.row.index]?.origen !== "real") {
          data.cell.styles.textColor = ACCENT;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 15;
    }
  }

  autoTable(doc, {
    startY: y,
    head: [["Cobertura por hora", ...cobertura.map((c) => c.hora)]],
    body: [["Empleados", ...cobertura.map((c) => String(c.cantidad))]],
    styles: { fontSize: 7, halign: "center", cellPadding: 1 },
    headStyles: { fillColor: [149, 25, 141], textColor: 255, fontSize: 7 },
  });

  doc.save(`horarios-dia-${fecha}.pdf`);
}
