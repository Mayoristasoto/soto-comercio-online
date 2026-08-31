import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ResumenEmpleado } from "@/pages/NovedadesLiquidacion";
import type { FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";
import type { VacacionNovedadRow } from "@/components/novedades/VacacionesNovedadesTable";
import type { AdelantoNovedadRow } from "@/components/novedades/AdelantosNovedadesTable";

export interface EmpleadoEstudio {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  obra_social: string | null;
  obra_social_desde: string | null;
  horas_jornada_estandar: number | null;
}

const up = (s: string) => (s || "").toLocaleUpperCase("es-AR");
const dm = (d: string) => format(new Date(d + "T00:00:00"), "dd/MM");
const money = (n: number) => "$" + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

/** Clasifica un día de novedad en la columna del estudio contable */
function clasificar(estado: string, detalle: string | null): "gremio" | "enf" | "enfFam" | "inasistencia" | null {
  const d = (detalle || "").toLowerCase();
  if (d.includes("gremio")) return "gremio";
  if (estado === "LIC_MEDICA") return "enf";
  if (estado === "NO_FICHADA") return "inasistencia";
  if (estado === "AUSENCIA_JUSTIFICADA" || estado === "OTRA_LICENCIA" || estado === "LICENCIA") {
    if (d.includes("familiar")) return "enfFam";
    if (d.includes("enfermedad") || d.includes("médic") || d.includes("medic") || d.includes("art") || d.includes("accidente")) return "enf";
    if (d.includes("sin justificar") || d.includes("ausente") || d.includes("injustificad")) return "inasistencia";
    return null;
  }
  return null;
}

export function exportNovedadesEstudioXLSX(
  empleados: EmpleadoEstudio[],
  resumen: ResumenEmpleado[],
  desde: string,
  hasta: string,
  feriados: FeriadoTrabajadoRow[] = [],
  vacaciones: VacacionNovedadRow[] = [],
  adelantos: AdelantoNovedadRow[] = [],
) {
  const ref = new Date(desde + "T00:00:00");
  const mes = up(format(ref, "MMMM", { locale: es }));
  const anio = ref.getFullYear();

  const resMap = new Map(resumen.map(r => [r.empleado_id, r]));

  // Conteos por empleado
  const feriadosPorEmp = new Map<string, number>();
  for (const f of feriados) {
    const k = (f as any).empleado_id as string;
    if (k) feriadosPorEmp.set(k, (feriadosPorEmp.get(k) || 0) + 1);
  }

  const vacPorEmp = new Map<string, { dias: number; rangos: string[] }>();
  for (const v of vacaciones) {
    const acc = vacPorEmp.get(v.empleado_id) || { dias: 0, rangos: [] };
    acc.dias += v.dias_en_periodo;
    acc.rangos.push(`${dm(v.fecha_inicio)} al ${dm(v.fecha_fin)}`);
    vacPorEmp.set(v.empleado_id, acc);
  }

  const adePorEmp = new Map<string, number>();
  for (const a of adelantos) {
    if (String(a.estado).toLowerCase() !== "aprobada") continue;
    adePorEmp.set(a.empleado_id, (adePorEmp.get(a.empleado_id) || 0) + Number(a.monto || 0));
  }

  const orden = (l: string | null) => {
    const n = Number(l);
    return Number.isFinite(n) ? n : 99999;
  };
  const lista = [...empleados].sort((a, b) => orden(a.legajo) - orden(b.legajo) || a.apellido.localeCompare(b.apellido));

  const aoa: (string | number | null)[][] = [];
  aoa.push([`Novedades SOTO ${mes} ${anio}`]);
  aoa.push([]);
  aoa.push(["Legajo", "Apellido y Nombre", "OBRA SOCIAL", "Feriados", "Dia Gremio", "Lic Enfermedad", "Lic. Enf. Familiar", "Inasistencias", " Ds Vacaciones", "Fechas Vac", "Observaciones"]);

  const anotaciones: string[] = [];

  for (const e of lista) {
    const res = resMap.get(e.id);
    let gremio = 0, enf = 0, enfFam = 0, inas = 0;
    for (const r of res?.rows || []) {
      const c = clasificar(r.estado, r.detalle);
      if (c === "gremio") gremio++;
      else if (c === "enf") enf++;
      else if (c === "enfFam") enfFam++;
      else if (c === "inasistencia") inas++;
    }

    const vac = vacPorEmp.get(e.id);
    const nombreCompleto = up(`${e.apellido} ${e.nombre}`);
    const obraSocial = e.obra_social
      ? e.obra_social + (e.obra_social_desde ? ` / Desde ${format(new Date(e.obra_social_desde + "T00:00:00"), "MM-yyyy")}` : "")
      : "";

    const adelanto = adePorEmp.get(e.id) || 0;
    const obs = `RECIBO POR ${e.horas_jornada_estandar ?? 8}HS`
      + (adelanto > 0 ? ` - ADELANTO ${money(adelanto)}` : "");

    aoa.push([
      e.legajo ?? "",
      nombreCompleto,
      obraSocial,
      feriadosPorEmp.get(e.id) || "",
      gremio || "",
      enf || "",
      enfFam || "",
      inas || "",
      vac?.dias || "",
      vac?.rangos.join(" / ") || "",
      obs,
    ]);

    if (vac?.rangos.length) anotaciones.push(`${nombreCompleto} VACACIONES DEL ${vac.rangos.join(" Y DEL ")}`);
    if (enf > 0) anotaciones.push(`${nombreCompleto} ${enf} DIAS ENFERMEDAD`);
    if (enfFam > 0) anotaciones.push(`${nombreCompleto} ${enfFam} DIAS ENFERMEDAD FAMILIAR`);
    if (gremio > 0) anotaciones.push(`${nombreCompleto} ${gremio} DIA/S GREMIO`);
    if (inas > 0) anotaciones.push(`${nombreCompleto} ${inas} Inasistencias`);
    if (adelanto > 0) anotaciones.push(`${nombreCompleto} ADELANTO ${money(adelanto)}`);
  }

  aoa.push([]);
  aoa.push(["", "ANOTACIONES GENERALES"]);
  const filasAnotaciones = Math.max(anotaciones.length, 13);
  for (let i = 0; i < filasAnotaciones; i++) {
    aoa.push([i + 1, anotaciones[i] ?? ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 8 }, { wch: 34 }, { wch: 26 }, { wch: 9 }, { wch: 10 },
    { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 13 }, { wch: 22 }, { wch: 42 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, mes.slice(0, 31));
  XLSX.writeFile(wb, `Novedades_SOTO_${mes}_${anio}.xlsx`);
}
