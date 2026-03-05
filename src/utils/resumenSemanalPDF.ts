import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { PDF_STYLES, COMPANY_INFO } from "./pdfStyles";
import { getArgentinaStartOfDay, getArgentinaEndOfDay } from "@/lib/dateUtils";

interface IncidenciaResumen {
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  sucursal: string;
  llegadas_tarde: number;
  exceso_descanso: number;
  salida_anticipada: number;
  ausencias: number;
  total: number;
}

interface EmpleadoSinFichaje {
  fecha: string;
  empleado_nombre: string;
  empleado_apellido: string;
  sucursal: string;
}

export async function generarResumenSemanalPDF(fechaReferencia?: string) {
  const refDate = fechaReferencia ? new Date(fechaReferencia + "T12:00:00") : new Date();
  const lunes = startOfWeek(refDate, { weekStartsOn: 1 });
  const domingo = endOfWeek(refDate, { weekStartsOn: 1 });

  const fechaDesde = format(lunes, "yyyy-MM-dd");
  const fechaHasta = format(domingo, "yyyy-MM-dd");

  // 1. Fetch incidencias
  const { data: incidencias, error: errInc } = await supabase
    .from("empleado_cruces_rojas")
    .select(`
      empleado_id,
      tipo_infraccion,
      empleados!empleado_cruces_rojas_empleado_id_fkey (
        nombre, apellido,
        sucursales ( nombre )
      )
    `)
    .gte("fecha_infraccion", fechaDesde)
    .lte("fecha_infraccion", fechaHasta + "T23:59:59")
    .eq("anulada", false);

  if (errInc) throw new Error("Error al cargar incidencias: " + errInc.message);

  // Aggregate by employee
  const mapaEmpleados = new Map<string, IncidenciaResumen>();
  for (const inc of incidencias || []) {
    const emp = inc.empleados as any;
    const id = inc.empleado_id;
    if (!mapaEmpleados.has(id)) {
      mapaEmpleados.set(id, {
        empleado_id: id,
        empleado_nombre: emp?.nombre || "Sin nombre",
        empleado_apellido: emp?.apellido || "",
        sucursal: emp?.sucursales?.nombre || "-",
        llegadas_tarde: 0,
        exceso_descanso: 0,
        salida_anticipada: 0,
        ausencias: 0,
        total: 0,
      });
    }
    const r = mapaEmpleados.get(id)!;
    if (inc.tipo_infraccion === "llegada_tarde") r.llegadas_tarde++;
    else if (inc.tipo_infraccion === "exceso_descanso") r.exceso_descanso++;
    else if (inc.tipo_infraccion === "salida_anticipada") r.salida_anticipada++;
    else if (inc.tipo_infraccion === "ausencia") r.ausencias++;
    r.total++;
  }

  const resumen = Array.from(mapaEmpleados.values()).sort((a, b) => b.total - a.total);

  // 2. Detect missing clock-ins using empleado_turnos logic
  const hoy = new Date();
  const limiteEnd = domingo > hoy ? hoy : domingo;
  const diasSemana = eachDayOfInterval({ start: lunes, end: limiteEnd });

  let sinFichaje: EmpleadoSinFichaje[] = [];

  // Get employees with active shifts
  const { data: empleadosConTurno } = await supabase
    .from("empleado_turnos")
    .select(`
      empleado_id,
      empleados!inner(id, nombre, apellido, activo, sucursales(nombre)),
      fichado_turnos!inner(dias_semana)
    `)
    .eq("activo", true)
    .eq("empleados.activo", true);

  if (empleadosConTurno && empleadosConTurno.length > 0) {
    // For each day, check who should have worked and who clocked in
    for (const dia of diasSemana) {
      const diaSemanaNum = dia.getDay();
      const startOfDay = getArgentinaStartOfDay(dia);
      const endOfDay = getArgentinaEndOfDay(dia);

      // Employees scheduled for this day
      const debianTrabajar = (empleadosConTurno as any[]).filter(et => {
        const dias = et.fichado_turnos?.dias_semana || [];
        return dias.includes(diaSemanaNum);
      });

      if (debianTrabajar.length === 0) continue;

      const { data: fichajesDia } = await supabase
        .from("fichajes")
        .select("empleado_id")
        .eq("tipo", "entrada")
        .gte("timestamp_real", startOfDay)
        .lte("timestamp_real", endOfDay);

      const ficharon = new Set((fichajesDia || []).map(f => f.empleado_id));

      for (const et of debianTrabajar) {
        if (!ficharon.has(et.empleado_id)) {
          sinFichaje.push({
            fecha: format(dia, "yyyy-MM-dd"),
            empleado_nombre: et.empleados.nombre,
            empleado_apellido: et.empleados.apellido,
            sucursal: et.empleados.sucursales?.nombre || "-",
          });
        }
      }
    }

    sinFichaje.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  // 3. Generate PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = PDF_STYLES.spacing.page.left;
  let y = margin;

  // Header gradient bar
  doc.setFillColor(75, 13, 109); // primary purple
  doc.rect(0, 0, pageWidth, 28, "F");

  // Try to load logo
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = COMPANY_INFO.logo;
    });
    if (img.complete && img.naturalWidth > 0) {
      doc.addImage(img, "JPEG", margin, 4, 20, 20);
    }
  } catch {}

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_STYLES.fonts.heading);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Semanal de Incidencias", margin + 24, 12);

  doc.setFontSize(PDF_STYLES.fonts.small);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${format(lunes, "EEEE dd/MM/yyyy", { locale: es })} — ${format(domingo, "EEEE dd/MM/yyyy", { locale: es })}`,
    margin + 24, 19
  );
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, margin + 24, 24);

  y = 36;

  // Summary cards
  const totalLT = resumen.reduce((s, r) => s + r.llegadas_tarde, 0);
  const totalED = resumen.reduce((s, r) => s + r.exceso_descanso, 0);
  const totalSA = resumen.reduce((s, r) => s + r.salida_anticipada, 0);
  const totalSF = sinFichaje.length;
  const totalAll = totalLT + totalED + totalSA + totalSF;

  const cards = [
    { label: "Lleg. Tarde", value: totalLT, color: [239, 68, 68] as [number, number, number] },
    { label: "Exc. Descanso", value: totalED, color: [245, 158, 11] as [number, number, number] },
    { label: "Sal. Anticipada", value: totalSA, color: [149, 25, 141] as [number, number, number] },
    { label: "Sin Fichaje", value: totalSF, color: [107, 114, 128] as [number, number, number] },
    { label: "TOTAL", value: totalAll, color: [75, 13, 109] as [number, number, number] },
  ];

  const cardWidth = (pageWidth - margin * 2 - 8) / cards.length;
  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 2);
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(String(card.value), x + cardWidth / 2, y + 10, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + cardWidth / 2, y + 15, { align: "center" });
  });

  y += 24;

  // Table: resumen por empleado
  doc.setTextColor(39, 44, 77);
  doc.setFontSize(PDF_STYLES.fonts.subheading);
  doc.setFont("helvetica", "bold");
  doc.text("Incidencias por Empleado", margin, y);
  y += 4;

  if (resumen.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["#", "Empleado", "Sucursal", "Lleg. Tarde", "Exc. Desc.", "Sal. Antic.", "Total"]],
      body: resumen.map((r, i) => [
        i + 1,
        `${r.empleado_apellido} ${r.empleado_nombre}`,
        r.sucursal,
        r.llegadas_tarde || "-",
        r.exceso_descanso || "-",
        r.salida_anticipada || "-",
        r.total,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [75, 13, 109], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setFont("helvetica", "italic");
    doc.text("No se registraron incidencias en esta semana.", margin, y + 4);
    y += 12;
  }

  // Section: sin fichaje
  if (y > 240) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(39, 44, 77);
  doc.setFontSize(PDF_STYLES.fonts.subheading);
  doc.setFont("helvetica", "bold");
  doc.text("Empleados sin Fichaje", margin, y);
  y += 4;

  if (sinFichaje.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Empleado", "Sucursal"]],
      body: sinFichaje.map(sf => [
        format(new Date(sf.fecha + "T12:00:00"), "EEEE dd/MM", { locale: es }),
        `${sf.empleado_apellido} ${sf.empleado_nombre}`,
        sf.sucursal,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [107, 114, 128], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setFont("helvetica", "italic");
    doc.text("Todos los empleados con horario asignado ficharon correctamente.", margin, y + 4);
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `${COMPANY_INFO.fullName} — Página ${p}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`resumen_semanal_${fechaDesde}_${fechaHasta}.pdf`);
}
