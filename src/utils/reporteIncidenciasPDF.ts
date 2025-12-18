import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_STYLES, PDF_CONFIG, COMPANY_INFO } from './pdfStyles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmpleadoIncidencia {
  empleado_id: string;
  nombre: string;
  apellido: string;
  sucursal_nombre: string;
  llegadas_tarde: number;
  pausas_excedidas: number;
  total: number;
  detalle_llegadas: Array<{
    fecha: string;
    hora_programada: string;
    hora_real: string;
    minutos_retraso: number;
  }>;
  detalle_pausas: Array<{
    fecha: string;
    duracion_minutos: number;
    exceso_minutos: number;
  }>;
}

interface ReporteIncidenciasData {
  fechaInicio: Date;
  fechaFin: Date;
  empleados: EmpleadoIncidencia[];
}

export const generateReporteIncidenciasPDF = (data: ReporteIncidenciasData) => {
  const doc = new jsPDF(PDF_CONFIG);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = PDF_STYLES.spacing.page.top;

  const fechaInicioStr = format(data.fechaInicio, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const fechaFinStr = format(data.fechaFin, "dd 'de' MMMM 'de' yyyy", { locale: es });

  // Función auxiliar para agregar texto centrado
  const addCenteredText = (text: string, y: number, fontSize: number, color?: string) => {
    doc.setFontSize(fontSize);
    if (color) doc.setTextColor(color);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
    doc.setTextColor(PDF_STYLES.colors.text);
  };

  // Función para verificar si necesitamos nueva página
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - PDF_STYLES.spacing.page.bottom) {
      doc.addPage();
      yPosition = PDF_STYLES.spacing.page.top;
      addPageNumber();
      return true;
    }
    return false;
  };

  // Función para agregar número de página
  const addPageNumber = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(PDF_STYLES.fonts.small);
    doc.setTextColor(PDF_STYLES.colors.textLight);
    doc.text(
      `Página ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.setTextColor(PDF_STYLES.colors.text);
  };

  // === PORTADA ===
  yPosition = pageHeight / 4;
  
  // Título principal
  addCenteredText(COMPANY_INFO.name, yPosition, PDF_STYLES.fonts.title, PDF_STYLES.colors.primary);
  yPosition += 15;

  // Título del documento
  addCenteredText('Reporte Semanal de Incidencias', yPosition, PDF_STYLES.fonts.subtitle, PDF_STYLES.colors.secondary);
  yPosition += 10;

  // Línea decorativa
  doc.setDrawColor(PDF_STYLES.colors.border);
  doc.line(pageWidth / 4, yPosition, (3 * pageWidth) / 4, yPosition);
  yPosition += 15;

  // Período
  addCenteredText(`Período: ${fechaInicioStr} - ${fechaFinStr}`, yPosition, PDF_STYLES.fonts.body);
  yPosition += 10;

  // Fecha de generación
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  addCenteredText(`Fecha de generación: ${today}`, yPosition, PDF_STYLES.fonts.small);
  yPosition += 30;

  // Resumen estadístico
  const totalEmpleadosConIncidencias = data.empleados.length;
  const totalLlegadasTarde = data.empleados.reduce((sum, e) => sum + e.llegadas_tarde, 0);
  const totalPausasExcedidas = data.empleados.reduce((sum, e) => sum + e.pausas_excedidas, 0);
  const totalIncidencias = totalLlegadasTarde + totalPausasExcedidas;

  doc.setFontSize(PDF_STYLES.fonts.heading);
  doc.setTextColor(PDF_STYLES.colors.primary);
  addCenteredText('Resumen del Período', yPosition, PDF_STYLES.fonts.heading, PDF_STYLES.colors.primary);
  yPosition += 12;

  // Cuadro de resumen
  doc.setDrawColor(PDF_STYLES.colors.border);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(pageWidth / 4, yPosition, pageWidth / 2, 40, 3, 3, 'FD');
  
  yPosition += 10;
  doc.setFontSize(PDF_STYLES.fonts.body);
  doc.setTextColor(PDF_STYLES.colors.text);
  
  const stats = [
    { label: 'Empleados con incidencias:', value: totalEmpleadosConIncidencias.toString() },
    { label: 'Total llegadas tarde:', value: totalLlegadasTarde.toString() },
    { label: 'Total pausas excedidas:', value: totalPausasExcedidas.toString() },
    { label: 'Total incidencias:', value: totalIncidencias.toString() },
  ];

  stats.forEach((stat, index) => {
    doc.text(stat.label, pageWidth / 4 + 10, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, pageWidth * 3 / 4 - 15, yPosition, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPosition += 7;
  });

  addPageNumber();

  // === TABLA RESUMEN ===
  doc.addPage();
  yPosition = PDF_STYLES.spacing.page.top;
  addPageNumber();

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('Listado de Empleados con Incidencias', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  if (data.empleados.length === 0) {
    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setTextColor(PDF_STYLES.colors.textLight);
    doc.text('No se registraron incidencias en el período seleccionado.', PDF_STYLES.spacing.page.left, yPosition);
  } else {
    // Ordenar por total de incidencias
    const empleadosOrdenados = [...data.empleados].sort((a, b) => b.total - a.total);

    autoTable(doc, {
      startY: yPosition,
      head: [[
        '#',
        'Empleado',
        'Sucursal',
        'Llegadas Tarde',
        'Pausas Excedidas',
        'Total'
      ]],
      body: empleadosOrdenados.map((emp, index) => [
        (index + 1).toString(),
        `${emp.nombre} ${emp.apellido}`,
        emp.sucursal_nombre,
        emp.llegadas_tarde.toString(),
        emp.pausas_excedidas.toString(),
        emp.total.toString()
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [75, 13, 109], // PDF_STYLES.colors.primary
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [39, 44, 77], // PDF_STYLES.colors.text
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: PDF_STYLES.spacing.page.left, right: PDF_STYLES.spacing.page.right },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // === DETALLE POR EMPLEADO ===
  if (data.empleados.length > 0) {
    const empleadosOrdenados = [...data.empleados].sort((a, b) => b.total - a.total);
    
    // Solo mostrar detalle de los primeros 10 empleados con más incidencias
    const empleadosDetalle = empleadosOrdenados.slice(0, 10);

    doc.addPage();
    yPosition = PDF_STYLES.spacing.page.top;
    addPageNumber();

    doc.setFontSize(PDF_STYLES.fonts.subtitle);
    doc.setTextColor(PDF_STYLES.colors.primary);
    doc.text('Detalle por Empleado (Top 10)', PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 5;

    doc.setFontSize(PDF_STYLES.fonts.small);
    doc.setTextColor(PDF_STYLES.colors.textLight);
    doc.text('Empleados con mayor cantidad de incidencias en el período', PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 12;

    empleadosDetalle.forEach((empleado, empIndex) => {
      checkNewPage(60);

      // Encabezado del empleado
      doc.setFontSize(PDF_STYLES.fonts.heading);
      doc.setTextColor(PDF_STYLES.colors.primary);
      doc.text(`${empIndex + 1}. ${empleado.nombre} ${empleado.apellido}`, PDF_STYLES.spacing.page.left, yPosition);
      yPosition += 6;

      doc.setFontSize(PDF_STYLES.fonts.body);
      doc.setTextColor(PDF_STYLES.colors.textLight);
      doc.text(`Sucursal: ${empleado.sucursal_nombre} | Total incidencias: ${empleado.total}`, PDF_STYLES.spacing.page.left, yPosition);
      yPosition += 8;

      // Llegadas tarde
      if (empleado.detalle_llegadas.length > 0) {
        doc.setFontSize(PDF_STYLES.fonts.subheading);
        doc.setTextColor(PDF_STYLES.colors.warning);
        doc.text(`Llegadas Tarde (${empleado.llegadas_tarde})`, PDF_STYLES.spacing.page.left + 5, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [['Fecha', 'Hora Programada', 'Hora Real', 'Retraso (min)']],
          body: empleado.detalle_llegadas.map(d => [
            d.fecha,
            d.hora_programada,
            d.hora_real,
            d.minutos_retraso.toString()
          ]),
          theme: 'plain',
          headStyles: {
            fillColor: [245, 158, 11], // Warning color
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [39, 44, 77],
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 35, halign: 'center' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
          },
          margin: { left: PDF_STYLES.spacing.page.left + 5, right: PDF_STYLES.spacing.page.right },
          tableWidth: pageWidth - 50,
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }

      // Pausas excedidas
      if (empleado.detalle_pausas.length > 0) {
        checkNewPage(30);
        
        doc.setFontSize(PDF_STYLES.fonts.subheading);
        doc.setTextColor(PDF_STYLES.colors.accent);
        doc.text(`Pausas Excedidas (${empleado.pausas_excedidas})`, PDF_STYLES.spacing.page.left + 5, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [['Fecha', 'Duración (min)', 'Exceso (min)']],
          body: empleado.detalle_pausas.map(d => [
            d.fecha,
            d.duracion_minutos.toString(),
            d.exceso_minutos.toString()
          ]),
          theme: 'plain',
          headStyles: {
            fillColor: [224, 68, 3], // Accent color
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [39, 44, 77],
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 40, halign: 'center' },
          },
          margin: { left: PDF_STYLES.spacing.page.left + 5, right: PDF_STYLES.spacing.page.right },
          tableWidth: pageWidth - 50,
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }

      yPosition += 8;
    });
  }

  // === PIE DE PÁGINA FINAL ===
  checkNewPage(30);
  yPosition = pageHeight - 40;

  doc.setDrawColor(PDF_STYLES.colors.border);
  doc.line(PDF_STYLES.spacing.page.left, yPosition, pageWidth - PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 8;

  doc.setFontSize(PDF_STYLES.fonts.small);
  doc.setTextColor(PDF_STYLES.colors.textLight);
  addCenteredText('Documento generado automáticamente por el Sistema de Gestión de RRHH', yPosition, PDF_STYLES.fonts.small);
  yPosition += 5;
  addCenteredText(`${COMPANY_INFO.name} - ${today}`, yPosition, PDF_STYLES.fonts.small);

  // Guardar PDF
  const fechaArchivo = format(data.fechaInicio, 'yyyyMMdd');
  const fileName = `Reporte_Incidencias_Semanal_${fechaArchivo}.pdf`;
  doc.save(fileName);

  return fileName;
};
