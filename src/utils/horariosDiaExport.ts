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
  dibujarDiaPDF(doc, fecha, filas, cobertura, filtros, valorHoraExtra);
  doc.save(`horarios-dia-${fecha}.pdf`);
}

function dibujarDiaPDF(
  doc: jsPDF,
  fecha: string,
  filas: FilaDiaExport[],
  cobertura: CoberturaHora[],
  filtros: string,
  valorHoraExtra = 0,
  tituloPrincipal = "Planificación del día"
) {

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const header = () => {
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, w, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(tituloPrincipal, 14, 10);
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

  // ---- Cobertura por hora y sucursal (grilla tipo mapa de calor) ----
  const sucursales = [...new Set(filas.map((f) => f.sucursal_nombre))].sort();
  const maxCob = Math.max(
    1,
    ...cobertura.flatMap((c) => sucursales.map((s) => c.porSucursal[s] ?? 0))
  );
  y = ensure(y, 16 + sucursales.length * 6.5);
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Cobertura de empleados por sucursal", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;

  const labelW = 42;
  const picoW = 12;
  const gridX = 14 + labelW;
  const gridW = w - 14 - gridX - picoW;
  const cellW = gridW / Math.max(1, cobertura.length);
  const rowH = 6;

  // Encabezado de horas
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  cobertura.forEach((c, i) => {
    doc.text(c.hora.slice(0, 2), gridX + i * cellW + cellW / 2, y + 3, { align: "center" });
  });
  doc.text("Pico", w - 14 - picoW / 2, y + 3, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 5;

  for (const s of sucursales) {
    y = ensure(y, rowH + 2);
    doc.setFontSize(7);
    doc.text(s.slice(0, 26), 14, y + rowH / 2 + 1.2);
    let pico = 0;
    cobertura.forEach((c, i) => {
      const n = c.porSucursal[s] ?? 0;
      pico = Math.max(pico, n);
      const x = gridX + i * cellW;
      if (n === 0) {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x + 0.4, y, cellW - 0.8, rowH - 1, 0.8, 0.8, "F");
        doc.setFontSize(6);
        doc.setTextColor(170, 175, 185);
        doc.text("-", x + cellW / 2, y + rowH / 2 + 0.8, { align: "center" });
        doc.setTextColor(0, 0, 0);
      } else {
        const t = n / maxCob; // 0..1
        const r = Math.round(191 - 154 * t);
        const g = Math.round(219 - 120 * t);
        const b = Math.round(254 - 19 * t);
        doc.setFillColor(r, g, b);
        doc.roundedRect(x + 0.4, y, cellW - 0.8, rowH - 1, 0.8, 0.8, "F");
        doc.setFontSize(6.2);
        doc.setTextColor(t > 0.45 ? 255 : 30);
        doc.text(String(n), x + cellW / 2, y + rowH / 2 + 0.8, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }
    });
    doc.setFontSize(7);
    doc.text(String(pico), w - 14 - picoW / 2, y + rowH / 2 + 1.2, { align: "center" });
    y += rowH;
  }
  y += 4;


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

}

/* ============================ Semana ============================ */

export interface DiaSemanaExport {
  fecha: string;
  filas: FilaDiaExport[];
  cobertura: CoberturaHora[];
}

const DIA_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const nombreDia = (fecha: string) => {
  const [y, m, d] = fecha.split("-").map(Number);
  return DIA_LABEL[new Date(y, m - 1, d).getDay()];
};

export function exportSemanaXLSX(
  inicio: string,
  dias: DiaSemanaExport[],
  filtros: string,
  valorHoraExtra = 0,
  nombre = ""
) {
  const wb = XLSX.utils.book_new();

  const totalHoras = dias.reduce((a, d) => a + d.filas.reduce((s, f) => s + f.horas, 0), 0);
  const totalExtras = dias.reduce((a, d) => a + d.filas.reduce((s, f) => s + (f.extras || 0), 0), 0);

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Campo: "Planificación", Valor: nombre || `Semana del ${fechaLarga(inicio)}` },
      { Campo: "Filtros", Valor: filtros },
      { Campo: "Horas programadas", Valor: Number(totalHoras.toFixed(2)) },
      { Campo: "Horas extras", Valor: Number(totalExtras.toFixed(2)) },
      { Campo: "Costo horas extras", Valor: Number((totalExtras * valorHoraExtra).toFixed(2)) },
    ]),
    "Info"
  );

  // Resumen por día
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      dias.map((d) => ({
        Día: nombreDia(d.fecha),
        Fecha: d.fecha,
        Empleados: new Set(d.filas.map((f) => f.empleado_id)).size,
        Tramos: d.filas.length,
        Horas: Number(d.filas.reduce((a, f) => a + f.horas, 0).toFixed(2)),
        "Horas extras": Number(d.filas.reduce((a, f) => a + (f.extras || 0), 0).toFixed(2)),
        "Pico cobertura": d.cobertura.reduce((m, c) => Math.max(m, c.cantidad), 0),
      }))
    ),
    "Resumen semanal"
  );

  // Horas por empleado
  const porEmpleado = new Map<string, { nombre: string; horas: number; extras: number; dias: Set<string> }>();
  for (const d of dias)
    for (const f of d.filas) {
      const cur =
        porEmpleado.get(f.empleado_id) ?? { nombre: f.nombre, horas: 0, extras: 0, dias: new Set<string>() };
      cur.horas += f.horas;
      cur.extras += f.extras || 0;
      cur.dias.add(d.fecha);
      porEmpleado.set(f.empleado_id, cur);
    }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      [...porEmpleado.values()]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((e) => ({
          Empleado: e.nombre,
          "Días trabajados": e.dias.size,
          Horas: Number(e.horas.toFixed(2)),
          "Horas extras": Number(e.extras.toFixed(2)),
        }))
    ),
    "Horas por empleado"
  );

  // Horas por sucursal
  const porSucursal = new Map<string, number>();
  for (const d of dias) for (const f of d.filas) porSucursal.set(f.sucursal_nombre, (porSucursal.get(f.sucursal_nombre) ?? 0) + f.horas);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      [...porSucursal.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([s, hs]) => ({ Sucursal: s, Horas: Number(hs.toFixed(2)) }))
    ),
    "Horas por sucursal"
  );

  // Una hoja por día
  for (const d of dias) {
    const hoja = d.filas.map((f) => ({
      Sucursal: f.sucursal_nombre,
      Empleado: f.nombre,
      Entrada: f.entrada,
      Salida: f.salida,
      "Pausa (min)": f.pausa,
      Horas: Number(f.horas.toFixed(2)),
      "Horas extras": f.extras || 0,
      Origen: ORIGEN_LABEL[f.origen],
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(hoja.length ? hoja : [{ Sucursal: "Sin asignaciones" }]),
      `${nombreDia(d.fecha).slice(0, 3)} ${d.fecha.slice(5)}`
    );
  }

  XLSX.writeFile(wb, `planificacion-semana-${inicio}.xlsx`);
}

export function exportSemanaPDF(
  inicio: string,
  dias: DiaSemanaExport[],
  filtros: string,
  valorHoraExtra = 0,
  nombre = ""
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  // Portada / resumen semanal
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Planificación semanal", 14, 10);
  doc.setFontSize(10);
  doc.text(nombre || `Semana del ${fechaLarga(inicio)}`, 14, 17);
  doc.setFontSize(8);
  doc.text(filtros, w - 14, 17, { align: "right" });
  doc.setTextColor(...ACCENT);
  doc.setFontSize(8);
  doc.text("Documento informativo — no modifica los horarios asignados", 14, 28);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 34,
    head: [["Día", "Fecha", "Empleados", "Tramos", "Horas", "H. extras", "Pico cobertura"]],
    body: dias.map((d) => [
      nombreDia(d.fecha),
      d.fecha,
      String(new Set(d.filas.map((f) => f.empleado_id)).size),
      String(d.filas.length),
      d.filas.reduce((a, f) => a + f.horas, 0).toFixed(1),
      d.filas.reduce((a, f) => a + (f.extras || 0), 0).toFixed(1),
      String(d.cobertura.reduce((m, c) => Math.max(m, c.cantidad), 0)),
    ]),
    styles: { fontSize: 8, halign: "center", cellPadding: 1.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  const porEmpleado = new Map<string, { nombre: string; horas: number; extras: number; dias: Set<string> }>();
  for (const d of dias)
    for (const f of d.filas) {
      const cur =
        porEmpleado.get(f.empleado_id) ?? { nombre: f.nombre, horas: 0, extras: 0, dias: new Set<string>() };
      cur.horas += f.horas;
      cur.extras += f.extras || 0;
      cur.dias.add(d.fecha);
      porEmpleado.set(f.empleado_id, cur);
    }

  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Horas por empleado", 14, y);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: y + 2,
    head: [["Empleado", "Días", "Horas", "H. extras"]],
    body: [...porEmpleado.values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((e) => [e.nombre, String(e.dias.size), e.horas.toFixed(1), e.extras.toFixed(1)]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
    headStyles: { fillColor: [149, 25, 141], textColor: 255, fontSize: 8 },
  });

  // Un bloque por día
  for (const d of dias) {
    doc.addPage();
    dibujarDiaPDF(doc, d.fecha, d.filas, d.cobertura, filtros, valorHoraExtra, "Planificación semanal");
  }

  doc.save(`planificacion-semana-${inicio}.pdf`);
}

/* ================= Resumen compacto (cobertura + horarios) ================= */

export function exportSemanaResumenPDF(
  inicio: string,
  dias: DiaSemanaExport[],
  filtros: string,
  nombre = ""
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = 8;

  // Rango de horas con actividad
  const horasConDatos = new Set<string>();
  for (const d of dias) for (const c of d.cobertura) if (c.cantidad > 0) horasConDatos.add(c.hora);
  const horas = (dias[0]?.cobertura ?? []).map((c) => c.hora).filter((hh) => horasConDatos.has(hh));

  const cabecera = () => {
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, w, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("Resumen semanal — cobertura por hora y horarios", M, 5.5);
    doc.setFontSize(7);
    doc.text(nombre || `Semana del ${fechaLarga(inicio)}`, M, 9.8);
    doc.text(filtros, w - M, 9.8, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  cabecera();
  let y = 16;

  for (const d of dias) {
    const filas = d.filas;
    const porEmp = new Map<string, { nombre: string; suc: string; tramos: string[] }>();
    for (const f of filas) {
      const cur = porEmp.get(f.empleado_id) ?? { nombre: f.nombre, suc: f.sucursal_nombre, tramos: [] };
      cur.tramos.push(`${f.entrada}-${f.salida}`);
      porEmp.set(f.empleado_id, cur);
    }
    const items = [...porEmp.values()].sort((a, b) => a.suc.localeCompare(b.suc) || a.nombre.localeCompare(b.nombre));

    const cols = 4;
    const lineas = Math.ceil(items.length / cols);
    const need = 6 + (horas.length ? 8 : 0) + lineas * 3.2 + 4;
    if (y + need > h - 6) {
      doc.addPage();
      cabecera();
      y = 16;
    }

    // Título del día
    doc.setFillColor(240, 235, 246);
    doc.rect(M, y, w - M * 2, 5, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(...PRIMARY);
    const totH = filas.reduce((a, f) => a + f.horas, 0);
    doc.text(`${nombreDia(d.fecha)} ${d.fecha.slice(8)}/${d.fecha.slice(5, 7)}`, M + 1.5, y + 3.5);
    doc.text(
      `${porEmp.size} empleados · ${totH.toFixed(1)} h`,
      w - M - 1.5,
      y + 3.5,
      { align: "right" }
    );
    doc.setTextColor(0, 0, 0);
    y += 6;

    // Cobertura por hora (una fila de horas + una de cantidades)
    if (horas.length) {
      const cw = (w - M * 2) / horas.length;
      doc.setFontSize(5.5);
      horas.forEach((hh, i) => {
        const x = M + i * cw;
        const cant = d.cobertura.find((c) => c.hora === hh)?.cantidad ?? 0;
        doc.setFillColor(...PRIMARY);
        doc.setTextColor(255, 255, 255);
        doc.rect(x, y, cw, 3.2, "F");
        doc.text(hh, x + cw / 2, y + 2.3, { align: "center" });
        const int = cant === 0 ? 255 : Math.max(215 - cant * 12, 150);
        doc.setFillColor(int, int, 245);
        doc.rect(x, y + 3.2, cw, 3.6, "F");
        doc.setDrawColor(220);
        doc.rect(x, y + 3.2, cw, 3.6, "S");
        doc.setTextColor(cant === 0 ? 160 : 20);
        doc.text(String(cant), x + cw / 2, y + 5.8, { align: "center" });
      });
      doc.setTextColor(0, 0, 0);
      y += 8;
    }

    // Horarios por empleado en columnas
    doc.setFontSize(6);
    const colW = (w - M * 2) / cols;
    items.forEach((it, idx) => {
      const c = Math.floor(idx / lineas);
      const r = idx % lineas;
      const x = M + c * colW;
      const texto = `${it.nombre} · ${it.tramos.join(" / ")} (${it.suc})`;
      doc.text(doc.splitTextToSize(texto, colW - 2)[0], x, y + r * 3.2 + 2.2);
    });
    y += lineas * 3.2 + 4;
    if (!items.length) {
      doc.setTextColor(150);
      doc.text("Sin asignaciones", M, y - 2);
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(`resumen-semana-${inicio}.pdf`);
}



