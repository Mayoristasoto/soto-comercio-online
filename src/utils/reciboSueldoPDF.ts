import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReciboData {
  empleado: {
    legajo: string;
    nombre: string;
    dni: string;
    cuil: string;
    puesto: string;
    fecha_ingreso: string;
    convenio: string;
    categoria: string;
  };
  periodo: {
    mes: number;
    anio: number;
    fecha_pago: string;
  };
  conceptos_remunerativos: Array<{
    codigo: string;
    descripcion: string;
    cantidad: number;
    valor_unitario: number;
    importe: number;
  }>;
  conceptos_no_remunerativos: Array<{
    codigo: string;
    descripcion: string;
    cantidad: number;
    valor_unitario: number;
    importe: number;
  }>;
  deducciones: Array<{
    codigo: string;
    descripcion: string;
    importe: number;
  }>;
  totales: {
    total_remunerativo: number;
    total_no_remunerativo: number;
    total_deducciones: number;
    neto_a_pagar: number;
  };
  estadisticas?: {
    horas_trabajadas: number;
    dias_trabajados: number;
  };
}

export const generateReciboSueldoPDF = async (data: ReciboData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Función helper para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  // Función helper para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  // Header - Empresa
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA DEMO S.A.', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CUIT: 30-12345678-9', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text('Dirección: Av. Ejemplo 1234, CABA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Título del recibo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE HABERES', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Período
  const mesNombre = new Date(data.periodo.anio, data.periodo.mes - 1).toLocaleString('es-ES', { month: 'long' });
  doc.setFontSize(11);
  doc.text(`Período: ${mesNombre.toUpperCase()} ${data.periodo.anio}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Datos del empleado en tabla
  autoTable(doc, {
    startY: yPos,
    head: [['DATOS DEL EMPLEADO', '']],
    body: [
      ['Legajo:', data.empleado.legajo],
      ['Nombre:', data.empleado.nombre],
      ['CUIL:', data.empleado.cuil],
      ['Puesto:', data.empleado.puesto],
      ['Fecha de Ingreso:', formatDate(data.empleado.fecha_ingreso)],
      ['Convenio:', data.empleado.convenio],
      ['Categoría:', data.empleado.categoria],
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 51, 51], fontSize: 10, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    styles: { fontSize: 9 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Estadísticas de fichajes (si existen)
  if (data.estadisticas) {
    autoTable(doc, {
      startY: yPos,
      head: [['ESTADÍSTICAS DEL PERÍODO', '']],
      body: [
        ['Días Trabajados:', data.estadisticas.dias_trabajados.toString()],
        ['Horas Trabajadas:', data.estadisticas.horas_trabajadas.toFixed(2)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontSize: 10, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      styles: { fontSize: 9 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Conceptos Remunerativos
  if (data.conceptos_remunerativos.length > 0) {
    const remunerativosBody = data.conceptos_remunerativos.map(c => [
      c.codigo,
      c.descripcion,
      c.cantidad.toFixed(2),
      formatCurrency(c.valor_unitario),
      formatCurrency(c.importe)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Cód.', 'Concepto Remunerativo', 'Cant.', 'Valor Unit.', 'Importe']],
      body: remunerativosBody,
      foot: [['', '', '', 'TOTAL REMUNERATIVO:', formatCurrency(data.totales.total_remunerativo)]],
      theme: 'striped',
      headStyles: { fillColor: [46, 125, 50], fontSize: 9, fontStyle: 'bold' },
      footStyles: { fillColor: [200, 230, 201], fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      },
      styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // Conceptos No Remunerativos
  if (data.conceptos_no_remunerativos.length > 0) {
    const noRemunerativosBody = data.conceptos_no_remunerativos.map(c => [
      c.codigo,
      c.descripcion,
      c.cantidad.toFixed(2),
      formatCurrency(c.valor_unitario),
      formatCurrency(c.importe)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Cód.', 'Concepto No Remunerativo', 'Cant.', 'Valor Unit.', 'Importe']],
      body: noRemunerativosBody,
      foot: [['', '', '', 'TOTAL NO REMUNERATIVO:', formatCurrency(data.totales.total_no_remunerativo)]],
      theme: 'striped',
      headStyles: { fillColor: [66, 165, 245], fontSize: 9, fontStyle: 'bold' },
      footStyles: { fillColor: [187, 222, 251], fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      },
      styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
  }

  // Deducciones
  if (data.deducciones.length > 0) {
    const deduccionesBody = data.deducciones.map(d => [
      d.codigo,
      d.descripcion,
      formatCurrency(d.importe)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Cód.', 'Deducción', 'Importe']],
      body: deduccionesBody,
      foot: [['', 'TOTAL DEDUCCIONES:', formatCurrency(data.totales.total_deducciones)]],
      theme: 'striped',
      headStyles: { fillColor: [211, 47, 47], fontSize: 9, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 205, 210], fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 130 },
        2: { cellWidth: 35, halign: 'right' }
      },
      styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Neto a Pagar - Destacado
  autoTable(doc, {
    startY: yPos,
    body: [['NETO A PAGAR', formatCurrency(data.totales.neto_a_pagar)]],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 130, fontStyle: 'bold', fontSize: 12, halign: 'right' },
      1: { cellWidth: 55, fontStyle: 'bold', fontSize: 14, halign: 'right', fillColor: [255, 235, 59] }
    },
    styles: { lineWidth: 0.5, lineColor: [0, 0, 0] }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Footer con fecha de pago y firma
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de Pago: ${formatDate(data.periodo.fecha_pago)}`, 15, yPos);
  
  yPos += 20;
  doc.line(15, yPos, 90, yPos);
  yPos += 5;
  doc.text('Firma del Empleado', 15, yPos);

  // Guardar PDF
  const fileName = `Recibo_${data.empleado.legajo}_${data.periodo.mes}_${data.periodo.anio}.pdf`;
  doc.save(fileName);

  return fileName;
};
