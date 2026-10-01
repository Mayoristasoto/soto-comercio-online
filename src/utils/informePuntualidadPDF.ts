import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface Evento {
  empleado_id: string; nombre: string; apellido: string; sucursal_id: string | null;
  tipo: "tarde" | "descanso"; fecha: string; programada: string | null; real_inicio: string | null; real_fin: string | null;
  minutos: number; justificado: boolean;
}
export interface MesRes { tardes: number; minTarde: number; descansos: number; minDescanso: number }
export interface ResumenEmpleado { empleado_id: string; nombre: string; porMes: Record<string, MesRes>; eventos: Evento[]; revisar: boolean }

const PRIMARY: [number, number, number] = [75, 13, 109];
const ACCENT: [number, number, number] = [224, 68, 3];
const dmy = (s: string) => s.split("-").reverse().join("/");
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const nombreMes = (k: string) => `${MESES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;

export function generarPDFPuntualidad(r: ResumenEmpleado, meses: string[], desde: string, hasta: string) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PRIMARY); doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("Informe de puntualidad y descansos", 14, 14);
  doc.setTextColor(0, 0, 0); doc.setFontSize(11);
  doc.text(r.nombre, 14, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Período: ${dmy(desde)} al ${dmy(hasta)}`, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [["Mes", "Llegadas tarde", "Min. de atraso", "Excesos descanso", "Min. excedidos"]],
    body: meses.map(k => { const p = r.porMes[k]; return [nombreMes(k), p?.tardes ?? 0, p?.minTarde ?? 0, p?.descansos ?? 0, p?.minDescanso ?? 0]; }),
    headStyles: { fillColor: PRIMARY }, styles: { fontSize: 9, halign: "center" }, columnStyles: { 0: { halign: "left" } },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;
  if (r.revisar) {
    doc.setTextColor(...ACCENT); doc.text("Atención: hay atrasos mayores a 120 min. Verificar el horario asignado.", 14, y); doc.setTextColor(0, 0, 0); y += 6;
  }

  const filas = r.eventos.filter(e => !e.justificado);
  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Tipo", "Horario / Inicio", "Real / Fin", "Minutos"]],
    body: filas.map(e => [dmy(e.fecha), e.tipo === "tarde" ? "Llegada tarde" : "Exceso descanso",
      (e.tipo === "tarde" ? e.programada : e.real_inicio)?.slice(0, 5) ?? "", (e.tipo === "tarde" ? e.real_inicio : e.real_fin)?.slice(0, 5) ?? "", e.minutos]),
    headStyles: { fillColor: [149, 25, 141] }, styles: { fontSize: 8 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Compromiso del mes", 14, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const txt = "Me comprometo a respetar el horario de ingreso asignado y la duración del descanso. Entiendo que desde este mes la tolerancia es de 0 minutos y que, a partir de la 3ra llegada tarde o exceso de descanso en el mes, se registrará un llamado de atención en mi legajo, y a partir de la 5ta, un apercibimiento.";
  doc.text(doc.splitTextToSize(txt, W - 28), 14, y + 6);
  y += 40;
  doc.line(20, y, 90, y); doc.line(W - 90, y, W - 20, y);
  doc.text("Firma del empleado", 35, y + 5); doc.text("Firma RRHH", W - 65, y + 5);
  doc.text(`Fecha: ____/____/______`, 14, y + 15);
  return doc;
}
