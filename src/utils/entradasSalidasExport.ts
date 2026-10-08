import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_INFO } from "./pdfStyles";

export interface FilaES {
  fecha: string; // yyyy-MM-dd
  empleado_id: string;
  empleado: string;
  sucursal: string;
  horario: string;
  entrada: string | null;
  salida: string | null;
  tarde: number; // min
  antes: number; // min
  jornadaMin: number | null;
  esperadoMin: number | null;
  estado: string;
}

export interface ResumenES {
  empleado: string;
  dias: number;
  tardes: number;
  minTarde: number;
  antes: number;
  minAntes: number;
  totalMin: number;
}

export const hhmm = (m: number | null) => {
  if (m == null) return "";
  const s = m < 0 ? "-" : "";
  const a = Math.abs(m);
  return `${s}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
};
const fF = (f: string) => f.split("-").reverse().join("/");

export function exportESXLSX(filas: FilaES[], res: ResumenES[], mes: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas.map((f) => ({
    Fecha: fF(f.fecha), Empleado: f.empleado, Sucursal: f.sucursal, Horario: f.horario,
    Entrada: f.entrada || "", "Llegó tarde (min)": f.tarde || "", Salida: f.salida || "",
    "Se fue antes (min)": f.antes || "", "Jornada total": hhmm(f.jornadaMin), Estado: f.estado,
  }))), "Detalle");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.map((r) => ({
    Empleado: r.empleado, "Días trabajados": r.dias, "Llegadas tarde": r.tardes, "Min tarde": r.minTarde,
    "Salidas temprano": r.antes, "Min antes": r.minAntes, "Horas totales": hhmm(r.totalMin),
  }))), "Resumen");
  XLSX.writeFile(wb, `entradas_salidas_${mes}.xlsx`);
}

export function exportESPDF(filas: FilaES[], res: ResumenES[], mes: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(`Entradas y salidas — ${mes}`, 14, 14);
  doc.setFontSize(9);
  doc.text(COMPANY_INFO.name, 14, 20);
  autoTable(doc, {
    startY: 25,
    head: [["Empleado", "Días", "Tardes", "Min tarde", "Salidas antes", "Min antes", "Horas totales"]],
    body: res.map((r) => [r.empleado, r.dias, r.tardes, r.minTarde, r.antes, r.minAntes, hhmm(r.totalMin)]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [75, 13, 109] },
  });
  const porEmp = new Map<string, FilaES[]>();
  filas.forEach((f) => { if (!porEmp.has(f.empleado)) porEmp.set(f.empleado, []); porEmp.get(f.empleado)!.push(f); });
  porEmp.forEach((rows, emp) => {
    doc.addPage();
    doc.setFontSize(12);
    doc.text(`${emp} — ${mes}`, 14, 14);
    autoTable(doc, {
      startY: 19,
      head: [["Fecha", "Horario", "Entrada", "Tarde", "Salida", "Antes", "Jornada", "Estado"]],
      body: rows.map((f) => [fF(f.fecha), f.horario, f.entrada || "-", f.tarde ? `+${f.tarde}` : "", f.salida || "-", f.antes ? `-${f.antes}` : "", hhmm(f.jornadaMin), f.estado]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [149, 25, 141] },
      didParseCell: (d) => {
        if (d.section === "body" && (d.column.index === 3 || d.column.index === 5) && d.cell.raw) d.cell.styles.textColor = [224, 68, 3];
      },
    });
  });
  doc.save(`entradas_salidas_${mes}.pdf`);
}
