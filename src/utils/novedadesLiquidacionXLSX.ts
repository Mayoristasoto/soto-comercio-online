import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { ResumenEmpleado } from "@/pages/NovedadesLiquidacion";
import type { FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";
import type { VacacionNovedadRow } from "@/components/novedades/VacacionesNovedadesTable";
import type { HoraExtraNovedadRow } from "@/components/novedades/HorasExtrasNovedadesTable";
import type { AdelantoNovedadRow } from "@/components/novedades/AdelantosNovedadesTable";

export interface NovedadesExtras {
  vacaciones?: VacacionNovedadRow[];
  horasExtras?: HoraExtraNovedadRow[];
  adelantos?: AdelantoNovedadRow[];
}

export function exportNovedadesXLSX(
  resumen: ResumenEmpleado[],
  desde: string,
  hasta: string,
  feriados: FeriadoTrabajadoRow[] = [],
  extras: NovedadesExtras = {},
) {
  const wb = XLSX.utils.book_new();


  // Hoja 1: Resumen
  const resumenRows = resumen.map(e => ({
    Legajo: e.legajo || "",
    Empleado: e.nombre,
    Sucursal: e.sucursal || "",
    "Días esperados": e.dias_esperados,
    Trabajados: e.trabajados,
    Feriados: e.feriados,
    Vacaciones: e.vacaciones,
    "Lic. Médica": e.lic_medica,
    "Otras licencias": e.otras_licencias,
    "NO FICHADAS": e.no_fichadas,
    "Horas esperadas": Number(e.horas_esperadas.toFixed(2)),
    "Horas trabajadas": Number(e.horas_trabajadas.toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), "Resumen");

  // Hoja 2: Detalle día por día
  const detalleRows: any[] = [];
  for (const e of resumen) {
    for (const r of e.rows) {
      detalleRows.push({
        Legajo: e.legajo || "",
        Empleado: e.nombre,
        Sucursal: e.sucursal || "",
        Fecha: r.fecha,
        Turno: r.turno_nombre || "",
        "Hora entrada": r.hora_entrada_esperada?.slice(0, 5) || "",
        "Hora salida": r.hora_salida_esperada?.slice(0, 5) || "",
        Estado: r.estado,
        Detalle: r.detalle || "",
        "Horas esperadas": Number(Number(r.horas_esperadas).toFixed(2)),
        "Horas trabajadas": Number(Number(r.horas_trabajadas).toFixed(2)),
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalleRows), "Detalle");

  // Hoja 3: Vacaciones del período
  const vacRows = resumen
    .flatMap(e => e.rows.filter(r => r.estado === "VACACIONES").map(r => ({
      Legajo: e.legajo || "",
      Empleado: e.nombre,
      Sucursal: e.sucursal || "",
      Fecha: r.fecha,
    })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vacRows), "Vacaciones");

  // Hoja 4: NO fichadas
  const noFichRows = resumen
    .flatMap(e => e.rows.filter(r => r.estado === "NO_FICHADA").map(r => ({
      Legajo: e.legajo || "",
      Empleado: e.nombre,
      Sucursal: e.sucursal || "",
      Fecha: r.fecha,
      "Horas esperadas": Number(Number(r.horas_esperadas).toFixed(2)),
    })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(noFichRows), "No Fichadas");

  // Hoja: Ausencias justificadas (informe gerencial)
  const justRows = resumen
    .flatMap(e => e.rows.filter(r => r.estado === "AUSENCIA_JUSTIFICADA").map(r => ({
      Legajo: e.legajo || "",
      Empleado: e.nombre,
      Sucursal: e.sucursal || "",
      Fecha: r.fecha,
      Motivo: r.detalle || "",
      "Horas esperadas": Number(Number(r.horas_esperadas).toFixed(2)),
    })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(justRows), "Ausencias Justificadas");

  // Hoja 5: Feriados trabajados
  const ferRows = feriados.map(f => ({
    Fecha: f.fecha,
    Feriado: f.feriado_nombre,
    Legajo: f.empleado_legajo || "",
    Empleado: `${f.empleado_apellido}, ${f.empleado_nombre}`,
    Sucursal: f.sucursal_nombre || "",
    "Hora entrada": f.hora_entrada?.slice(0, 5) || "",
    "Hora salida": f.hora_salida?.slice(0, 5) || "",
    "Horas trabajadas": Number(Number(f.horas_trabajadas).toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ferRows), "Feriados Trabajados");

  // Hoja 6: Vacaciones del período (solicitudes)
  const vacSolRows = (extras.vacaciones || []).map(v => ({
    Legajo: v.empleado_legajo || "",
    Empleado: v.empleado_nombre,
    Sucursal: v.sucursal_nombre || "",
    Desde: v.fecha_inicio,
    Hasta: v.fecha_fin,
    "Días en el período": v.dias_en_periodo,
    "Período devengado": v.periodo_devengado ?? "",
    Estado: v.estado,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vacSolRows), "Vacaciones Solicitudes");

  // Hoja 7: Horas extras (resumen y detalle)
  const hex = extras.horasExtras || [];
  const hexMap = new Map<string, { Empleado: string; Sucursal: string; Jornadas: number; "Hs hábiles": number; "Hs domingo": number; Monto: number }>();
  for (const h of hex) {
    const k = h.empleado_id || h.empleado_nombre;
    let acc = hexMap.get(k);
    if (!acc) { acc = { Empleado: h.empleado_nombre, Sucursal: h.sucursal_nombre || "", Jornadas: 0, "Hs hábiles": 0, "Hs domingo": 0, Monto: 0 }; hexMap.set(k, acc); }
    acc.Jornadas++;
    acc.Monto += Number(h.monto || 0);
    if (h.es_domingo) acc["Hs domingo"] += Number(h.extra_hs || 0);
    else acc["Hs hábiles"] += Number(h.extra_hs || 0);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...hexMap.values()].map(e => ({
    ...e, "Hs hábiles": Number(e["Hs hábiles"].toFixed(2)), "Hs domingo": Number(e["Hs domingo"].toFixed(2)), Monto: Number(e.Monto.toFixed(2)),
  }))), "Horas Extras");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hex.map(h => ({
    Fecha: h.fecha,
    Empleado: h.empleado_nombre,
    Sucursal: h.sucursal_nombre || "",
    Domingo: h.es_domingo ? "Sí" : "No",
    Entrada: h.entrada?.slice(0, 5) || "",
    Salida: h.salida?.slice(0, 5) || "",
    "Hs extra": Number(Number(h.extra_hs).toFixed(2)),
    Monto: Number(Number(h.monto).toFixed(2)),
  }))), "Horas Extras Detalle");

  // Hoja 8: Adelantos
  const adeRows = (extras.adelantos || []).map(a => ({
    Fecha: a.fecha_solicitud,
    Legajo: a.empleado_legajo || "",
    Empleado: a.empleado_nombre,
    Sucursal: a.sucursal_nombre || "",
    Monto: Number(Number(a.monto).toFixed(2)),
    Estado: a.estado,
    Origen: a.origen,
    Observaciones: a.descripcion || "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(adeRows), "Adelantos");



  XLSX.writeFile(wb, `novedades-liquidacion-${desde}-a-${hasta}.xlsx`);
}
