import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { ResumenEmpleado } from "@/pages/NovedadesLiquidacion";
import type { FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";

export function exportNovedadesXLSX(resumen: ResumenEmpleado[], desde: string, hasta: string, feriados: FeriadoTrabajadoRow[] = []) {
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

  XLSX.writeFile(wb, `novedades-liquidacion-${desde}-a-${hasta}.xlsx`);
}
