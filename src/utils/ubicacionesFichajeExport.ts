import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY_INFO } from "./pdfStyles";
import { formatArgentinaDate, formatArgentinaTime } from "@/lib/dateUtils";

export interface FilaUbicacion {
  fichaje_id: string;
  empleado_id: string;
  empleado: string;
  legajo: string | null;
  sucursal_nombre: string | null;
  tipo: string;
  metodo: string;
  timestamp_real: string;
  latitud: number | null;
  longitud: number | null;
  punto_nombre: string | null;
  centro_costo_nombre: string | null;
  distancia_metros: number | null;
  dentro_radio: boolean;
  clasificacion: string;
  origen: string;
}

export interface ResumenUbicacion {
  empleado: string;
  legajo: string | null;
  sucursal_nombre: string | null;
  total: number;
  porPunto: Record<string, number>;
  sinGps: number;
  fueraUbicacion: number;
  pctFuera: number;
  centrosCosto: string;
}

export interface ResumenDias {
  empleado: string;
  legajo: string | null;
  sucursal_nombre: string | null;
  diasTrabajados: number;
  diasPorPunto: Record<string, number>;
  pctPorPunto: Record<string, number>;
  diasHabilesPeriodo?: number;
  pctSobreHabiles?: Record<string, number>;
  pctDiasHabiles?: number;
  diasMultiKiosco?: number;
  fechasMultiKiosco?: string[];
  diasConExtras?: number;
  horasExtras?: number;
  diasVacaciones?: number;
  diasMedicas?: number;
  diasJustificados?: number;
  diasEsperados?: number;
  diasFaltantes?: number;
  cumple?: boolean;
  nota?: string;
}



const fmtFecha = (ts: string) => formatArgentinaDate(ts, "dd/MM/yyyy");
const fmtHora = (ts: string) => formatArgentinaTime(ts, "HH:mm");

export function exportUbicacionesXLSX(
  filas: FilaUbicacion[],
  resumen: ResumenUbicacion[],
  puntos: string[],
  desde: string,
  hasta: string,
  resumenDias: ResumenDias[] = [],
) {
  const wb = XLSX.utils.book_new();

  const detalle = filas.map((f) => ({
    Legajo: f.legajo || "",
    Empleado: f.empleado,
    Sucursal: f.sucursal_nombre || "",
    Fecha: fmtFecha(f.timestamp_real),
    Hora: fmtHora(f.timestamp_real),
    Tipo: f.tipo,
    Método: f.metodo,
    Origen: f.origen,
    Ubicación: f.clasificacion,
    "Centro de costo": f.centro_costo_nombre || "",
    "Distancia (m)": f.distancia_metros != null ? Math.round(f.distancia_metros) : "",
    Latitud: f.latitud ?? "",
    Longitud: f.longitud ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle");

  const res = resumen.map((r) => {
    const row: Record<string, string | number> = {
      Legajo: r.legajo || "",
      Empleado: r.empleado,
      Sucursal: r.sucursal_nombre || "",
      "Total fichajes": r.total,
    };
    puntos.forEach((p) => {
      row[p] = r.porPunto[p] || 0;
    });
    row["Fuera de ubicación"] = r.fueraUbicacion;
    row["Sin GPS"] = r.sinGps;
    row["% fuera"] = Number(r.pctFuera.toFixed(1));
    row["Centros de costo"] = r.centrosCosto;
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res), "Resumen");

  if (resumenDias.length) {
    const dias = resumenDias.map((r) => {
      const row: Record<string, string | number> = {
        Legajo: r.legajo || "",
        Empleado: r.empleado,
        Sucursal: r.sucursal_nombre || "",
        "Días trabajados": r.diasTrabajados,
      };
      puntos.forEach((p) => {
        row[`${p} (días)`] = r.diasPorPunto[p] || 0;
        row[`${p} (% días trabajados)`] = Number((r.pctPorPunto[p] || 0).toFixed(1));
        row[`${p} (% días hábiles)`] = Number((r.pctSobreHabiles?.[p] || 0).toFixed(1));
      });
      row["Días hábiles del período"] = r.diasHabilesPeriodo ?? "";
      row["% días hábiles trabajados"] = r.pctDiasHabiles != null ? Number(r.pctDiasHabiles.toFixed(1)) : "";
      row["Días vacaciones (hábiles)"] = r.diasVacaciones ?? 0;
      row["Días licencia médica"] = r.diasMedicas ?? 0;
      row["Faltas justificadas"] = r.diasJustificados ?? 0;
      row["Mínimo exigible"] = r.diasEsperados ?? "";
      row["Días faltantes sin justificar"] = r.diasFaltantes ?? 0;
      row["Cumple mínimo"] = r.cumple === false ? "NO" : "SÍ";
      row["Días en 2+ kioscos"] = r.diasMultiKiosco ?? 0;
      row["Fechas en 2+ kioscos"] = (r.fechasMultiKiosco || []).join(" · ");
      row["Días con horas extras"] = r.diasConExtras ?? 0;
      row["Horas extras (total)"] = r.horasExtras ?? 0;
      row["Observaciones"] = r.nota || "";

      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dias), "Días por kiosco");
  }


  XLSX.writeFile(wb, `ubicaciones_fichaje_${desde}_${hasta}.xlsx`);
}

export function exportUbicacionesPDF(
  filas: FilaUbicacion[],
  resumen: ResumenUbicacion[],
  puntos: string[],
  desde: string,
  hasta: string,
  resumenDias: ResumenDias[] = [],
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.text("Ubicaciones de fichaje", 14, 14);
  doc.setFontSize(9);
  doc.text(`${COMPANY_INFO.name} — Período ${desde} a ${hasta}`, 14, 20);

  autoTable(doc, {
    startY: 26,
    head: [[
      "Empleado",
      "Sucursal",
      "Total",
      ...puntos,
      "Fuera",
      "Sin GPS",
      "% fuera",
    ]],
    body: resumen.map((r) => [
      r.empleado,
      r.sucursal_nombre || "",
      r.total,
      ...puntos.map((p) => r.porPunto[p] || 0),
      r.fueraUbicacion,
      r.sinGps,
      `${r.pctFuera.toFixed(1)}%`,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [75, 13, 109] },
  });

  if (resumenDias.length) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Días trabajados por kiosco", 14, 14);
    doc.setFontSize(8);
    doc.text(
      `Días hábiles del período: ${resumenDias[0]?.diasHabilesPeriodo ?? "—"} (lunes a sábado). Los % se calculan sobre los días hábiles.`,
      14,
      19,
    );
    autoTable(doc, {
      startY: 23,
      head: [[
        "Empleado",
        "Sucursal",
        "Días trab.",
        "% s/hábiles",
        ...puntos.flatMap((p) => [`${p} días`, `${p} %`]),
        "Días 2 kioscos",
        "Días c/extras",
        "Hs extras",
        "Observaciones",
      ]],
      body: resumenDias.map((r) => [
        r.empleado,
        r.sucursal_nombre || "",
        r.diasTrabajados,
        `${(r.pctDiasHabiles || 0).toFixed(0)}%`,
        ...puntos.flatMap((p) => [
          r.diasPorPunto[p] || 0,
          `${(r.pctSobreHabiles?.[p] || 0).toFixed(0)}%`,
        ]),
        r.diasMultiKiosco || 0,
        r.diasConExtras || 0,
        (r.horasExtras || 0).toFixed(1),
        r.nota || "",
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.2 },
      headStyles: { fillColor: [224, 68, 3] },
    });
  }


  doc.addPage();
  doc.setFontSize(12);
  doc.text("Detalle de fichajes", 14, 14);
  autoTable(doc, {
    startY: 20,
    head: [["Empleado", "Fecha", "Hora", "Tipo", "Origen", "Ubicación", "Centro de costo", "Dist. (m)"]],
    body: filas.map((f) => [
      f.empleado,
      fmtFecha(f.timestamp_real),
      fmtHora(f.timestamp_real),
      f.tipo,
      f.origen,
      f.clasificacion,
      f.centro_costo_nombre || "",
      f.distancia_metros != null ? Math.round(f.distancia_metros) : "",
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [149, 25, 141] },
  });

  doc.save(`ubicaciones_fichaje_${desde}_${hasta}.pdf`);
}
