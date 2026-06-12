import jsPDF from "jspdf";
import { format, parseISO, differenceInCalendarDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export type TipoConstancia = "vacaciones_otorgamiento" | "vacaciones_goce";

export interface ConstanciaData {
  empleado: {
    nombre: string;
    apellido: string;
    dni?: string | null;
    legajo?: string | null;
    puesto?: string | null;
    sucursal?: string | null;
  };
  solicitud: {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
  };
}

const PRIMARY = "#4b0d6d";

const fechaLarga = (d: Date) =>
  format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

const today = () => fechaLarga(new Date());

/** Primer día NO domingo después de fecha_fin */
const calcularReintegro = (ff: Date) => {
  let r = addDays(ff, 1);
  while (r.getDay() === 0) r = addDays(r, 1);
  return r;
};

export const VARIABLES_DISPONIBLES = [
  { key: "empleado", desc: "Nombre y apellido" },
  { key: "dni", desc: "DNI" },
  { key: "legajo", desc: "Legajo" },
  { key: "puesto", desc: "Puesto" },
  { key: "sucursal", desc: "Sucursal" },
  { key: "fecha_inicio", desc: "Fecha de inicio (con día de la semana)" },
  { key: "fecha_fin", desc: "Fecha de fin (con día de la semana)" },
  { key: "fecha_reintegro", desc: "Día de reintegro" },
  { key: "dias", desc: "Cantidad de días corridos" },
  { key: "fecha_hoy", desc: "Fecha actual" },
  { key: "ciudad", desc: "Ciudad (default: Mar del Plata)" },
];

export function aplicarVariables(
  html: string,
  data: ConstanciaData,
  ciudad: string
): string {
  const fi = parseISO(data.solicitud.fecha_inicio);
  const ff = parseISO(data.solicitud.fecha_fin);
  const reintegro = calcularReintegro(ff);
  const dias = differenceInCalendarDays(ff, fi) + 1;

  const vars: Record<string, string> = {
    empleado: `${data.empleado.nombre ?? ""} ${data.empleado.apellido ?? ""}`.trim(),
    dni: data.empleado.dni ?? "",
    legajo: data.empleado.legajo ?? "",
    puesto: data.empleado.puesto ?? "",
    sucursal: data.empleado.sucursal ?? "",
    fecha_inicio: fechaLarga(fi),
    fecha_fin: fechaLarga(ff),
    fecha_reintegro: fechaLarga(reintegro),
    dias: String(dias),
    fecha_hoy: today(),
    ciudad,
  };

  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) =>
    vars[k.toLowerCase()] ?? `{{${k}}}`
  );
}

/** Convierte HTML simple a líneas de texto plano preservando saltos por párrafo */
function htmlToParagraphs(html: string): string[] {
  // separar por </p>, <br>, etc.
  const cleaned = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/(div|li)>/gi, "\n");
  // quitar todos los tags
  const text = cleaned.replace(/<[^>]+>/g, "");
  // decode básico
  const decoded = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return decoded.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export async function generarConstanciaPDF(
  tipo: TipoConstancia,
  data: ConstanciaData
) {
  const { data: plantilla, error } = await supabase
    .from("plantillas_documentos" as any)
    .select("contenido_html, ciudad_default, nombre")
    .eq("codigo", tipo)
    .maybeSingle();

  if (error || !plantilla) {
    throw new Error("No se encontró la plantilla del documento");
  }

  const ciudad = (plantilla as any).ciudad_default || "Mar del Plata";
  const htmlFinal = aplicarVariables((plantilla as any).contenido_html, data, ciudad);
  const parrafos = htmlToParagraphs(htmlFinal);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentW = pageW - margin * 2;

  // Header bar
  doc.setFillColor(PRIMARY);
  doc.rect(0, 0, pageW, 12, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(((plantilla as any).nombre || "").toUpperCase(), pageW / 2, 8, { align: "center" });

  // Cuerpo
  let y = 35;
  doc.setTextColor("#000000");
  doc.setFont("times", "normal");
  doc.setFontSize(12);

  for (const p of parrafos) {
    const lines = doc.splitTextToSize(p, contentW);
    // Si el primer párrafo tiene fecha (ciudad, fecha) lo derechamos
    const esFecha = /^[^,]+,\s+\w+/.test(p) && parrafos.indexOf(p) === 0;
    if (esFecha) {
      doc.text(lines, pageW - margin, y, { align: "right" });
    } else {
      doc.text(lines, margin, y, { align: "justify", maxWidth: contentW });
    }
    y += lines.length * 6 + 4;
    if (y > pageH - 80) {
      doc.addPage();
      y = 35;
    }
  }

  // Firmas al pie
  const firmaY = Math.max(y + 40, pageH - 55);
  doc.setDrawColor("#333333");
  doc.line(margin + 10, firmaY, pageW / 2 - 10, firmaY);
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.text("Firma", (margin + 10 + pageW / 2 - 10) / 2, firmaY + 5, { align: "center" });

  doc.setFontSize(11);
  doc.text(
    `Aclaración: ${data.empleado.nombre ?? ""} ${data.empleado.apellido ?? ""}`,
    margin,
    firmaY + 16
  );
  doc.text(`DNI: ${data.empleado.dni ?? "____________________"}`, margin, firmaY + 24);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor("#888888");
  doc.text(
    `Generado automáticamente · ${format(new Date(), "dd/MM/yyyy HH:mm")} · ID ${data.solicitud.id.slice(0, 8)}`,
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  const filename = `${tipo}_${data.empleado.apellido}_${format(parseISO(data.solicitud.fecha_inicio), "yyyyMMdd")}.pdf`;
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const w = window.open(blobUrl as any, "_blank");
  if (!w) doc.save(filename);
}

/** Carga datos del empleado + solicitud y dispara el PDF. */
export async function imprimirConstanciaVacaciones(
  tipo: TipoConstancia,
  solicitudId: string
) {
  const { data: sol, error } = await supabase
    .from("solicitudes_vacaciones")
    .select(`
      id, fecha_inicio, fecha_fin,
      empleado:empleado_id (
        id, nombre, apellido, legajo,
        sucursal:sucursal_id(nombre),
        datos:empleados_datos_sensibles(dni)
      )
    `)
    .eq("id", solicitudId)
    .maybeSingle();

  if (error || !sol?.empleado) {
    throw new Error("No se pudo cargar la solicitud");
  }
  const emp: any = sol.empleado;

  // puesto: tomar text column si existe
  let puestoTxt: string | null = null;
  const { data: empExtra } = await supabase
    .from("empleados")
    .select("puesto")
    .eq("id", emp.id)
    .maybeSingle();
  puestoTxt = (empExtra as any)?.puesto ?? null;

  await generarConstanciaPDF(tipo, {
    empleado: {
      nombre: emp.nombre,
      apellido: emp.apellido,
      legajo: emp.legajo ?? null,
      dni: emp.datos?.[0]?.dni ?? null,
      puesto: puestoTxt,
      sucursal: emp.sucursal?.nombre ?? null,
    },
    solicitud: {
      id: sol.id,
      fecha_inicio: sol.fecha_inicio,
      fecha_fin: sol.fecha_fin,
    },
  });
}
