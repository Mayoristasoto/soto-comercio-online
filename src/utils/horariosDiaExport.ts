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
  extras: number;
  costoExtra: number;
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
  filtros: string,
  valorHoraExtra = 0
) {
  const wb = XLSX.utils.book_new();

  const info = [
    { Campo: "Fecha", Valor: fechaLarga(fecha) },
    { Campo: "Filtros", Valor: filtros },
    { Campo: "Empleados", Valor: filas.length },
    { Campo: "Horas programadas", Valor: Number(filas.reduce((a, f) => a + f.horas, 0).toFixed(2)) },
    { Campo: "Valor hora extra", Valor: valorHoraExtra },
    { Campo: "Horas extras", Valor: Number(filas.reduce((a, f) => a + (f.extras || 0), 0).toFixed(2)) },
    { Campo: "Costo horas extras", Valor: Number(filas.reduce((a, f) => a + (f.costoExtra || 0), 0).toFixed(2)) },
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
    "Horas extras": f.extras || 0,
    "Costo extra": Number((f.costoExtra || 0).toFixed(2)),
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

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function exportDiaPDF(
  fecha: string,
  filas: FilaDiaExport[],
  cobertura: CoberturaHora[],
  filtros: string,
  valorHoraExtra = 0
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const header = () => {
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
    doc.setTextColor(0, 0, 0);
  };

  const ensure = (y: number, need: number) => {
    if (y + need > h - 12) {
      doc.addPage();
      return 18;
    }
    return y;
  };

  header();
  let y = 34;

  // ---- Resumen ----
  const totalHoras = filas.reduce((a, f) => a + f.horas, 0);
  const pico = cobertura.reduce((m, c) => Math.max(m, c.cantidad), 0);
  autoTable(doc, {
    startY: y,
    head: [[
      "Empleados / tramos",
      "Horas programadas",
      "Pico de cobertura",
      "Sucursales",
      "Horas extras",
      "Costo horas extras",
    ]],
    body: [[
      String(filas.length),
      `${totalHoras.toFixed(1)} h`,
      String(pico),
      String(new Set(filas.map((f) => f.sucursal_nombre)).size),
      `${filas.reduce((a, f) => a + (f.extras || 0), 0).toFixed(1)} h`,
      `$ ${filas.reduce((a, f) => a + (f.costoExtra || 0), 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
    ]],
    styles: { fontSize: 9, halign: "center", cellPadding: 2 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ---- Cobertura por hora ----
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Cobertura por hora", 14, y);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: y + 2,
    head: [["Hora", ...cobertura.map((c) => c.hora.slice(0, 2))]],
    body: [["Empleados", ...cobertura.map((c) => String(c.cantidad))]],
    styles: { fontSize: 7, halign: "center", cellPadding: 1 },
    headStyles: { fillColor: [149, 25, 141], textColor: 255, fontSize: 7 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ---- Cobertura por hora y sucursal ----
  const sucursales = [...new Set(filas.map((f) => f.sucursal_nombre))].sort();
  y = ensure(y, 14 + sucursales.length * 7);
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Cobertura por hora y sucursal", 14, y);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: y + 2,
    head: [["Sucursal", ...cobertura.map((c) => c.hora.slice(0, 2)), "Pico"]],
    body: sucursales.map((s) => [
      s,
      ...cobertura.map((c) => {
        const n = c.porSucursal[s] ?? 0;
        return n === 0 ? "-" : String(n);
      }),
      String(cobertura.reduce((m, c) => Math.max(m, c.porSucursal[s] ?? 0), 0)),
    ]),
    styles: { fontSize: 7, halign: "center", cellPadding: 1 },
    columnStyles: { 0: { halign: "left", cellWidth: 40 } },
    headStyles: { fillColor: [149, 25, 141], textColor: 255, fontSize: 7 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---- Gráfico de horarios ----
  const horaIni = cobertura.length ? Number(cobertura[0].hora.slice(0, 2)) : 6;
  const horaFin = cobertura.length ? Number(cobertura[cobertura.length - 1].hora.slice(0, 2)) + 1 : 24;
  const gx = 60;
  const gw = w - gx - 14;
  const spanMin = (horaFin - horaIni) * 60;

  const porSucursal = new Map<string, FilaDiaExport[]>();
  for (const f of filas) {
    if (!porSucursal.has(f.sucursal_nombre)) porSucursal.set(f.sucursal_nombre, []);
    porSucursal.get(f.sucursal_nombre)!.push(f);
  }

  y = ensure(y, 30);
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Gráfico de horarios", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 6;

  const drawAxis = (yy: number) => {
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    for (let hh = horaIni; hh <= horaFin; hh++) {
      const x = gx + ((hh - horaIni) * 60 * gw) / spanMin;
      doc.text(String(hh).padStart(2, "0"), x, yy, { align: "center" });
      doc.setDrawColor(225, 225, 225);
      doc.line(x, yy + 1, x, yy + 1.5);
    }
    doc.setTextColor(0, 0, 0);
    return yy + 3;
  };

  y = drawAxis(y);

  for (const [suc, rows] of [...porSucursal.entries()].sort()) {
    // Un empleado con varios tramos en la misma sucursal se dibuja en una sola línea
    const lineas = new Map<string, FilaDiaExport[]>();
    for (const f of rows) {
      const arr = lineas.get(f.empleado_id) ?? [];
      arr.push(f);
      lineas.set(f.empleado_id, arr);
    }

    y = ensure(y, 12);
    doc.setFontSize(8);
    doc.setTextColor(...PRIMARY);
    doc.text(`${suc} (${lineas.size})`, 14, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 5;

    for (const tramos of lineas.values()) {
      if (y + 6 > h - 12) {
        doc.addPage();
        y = drawAxis(18);
      }
      doc.setFontSize(6.5);
      doc.text(tramos[0].nombre.slice(0, 34), 14, y + 3.2);
      doc.setFillColor(245, 245, 248);
      doc.rect(gx, y, gw, 4.5, "F");
      for (const f of tramos) {
        const ini = Math.max(toMin(f.entrada), horaIni * 60);
        const fin = Math.min(toMin(f.salida), horaFin * 60);
        if (fin > ini) {
          const x = gx + ((ini - horaIni * 60) * gw) / spanMin;
          const bw = ((fin - ini) * gw) / spanMin;
          if (f.origen === "real") doc.setFillColor(37, 99, 235);
          else doc.setFillColor(...ACCENT);
          doc.roundedRect(x, y, bw, 4.5, 1, 1, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(5.5);
          if (bw > 18) doc.text(`${f.entrada}–${f.salida}`, x + 1.5, y + 3.1);
          doc.setTextColor(0, 0, 0);
        }
      }
      y += 5.5;
    }
    y += 2;
  }


  // ---- Planificación del día (detalle) ----
  doc.addPage();
  header();
  y = 34;
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Planificación del día", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 3;

  for (const [suc, rows] of [...porSucursal.entries()].sort()) {
    autoTable(doc, {
      startY: y,
      head: [[
        `${suc} (${rows.length})`,
        "Turno",
        "Entrada",
        "Salida",
        "Pausa",
        "Horas",
        "H. extras",
        "Costo extra",
        "Origen",
      ]],
      body: rows.map((f) => [
        f.nombre,
        f.turno_nombre,
        f.entrada,
        f.salida,
        `${f.pausa} min`,
        f.horas.toFixed(2),
        (f.extras || 0) ? `${f.extras} h` : "-",
        (f.costoExtra || 0)
          ? `$ ${f.costoExtra.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
          : "-",
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
    if (y > h - 30) {
      doc.addPage();
      y = 15;
    }
  }

  doc.save(`horarios-dia-${fecha}.pdf`);
}

