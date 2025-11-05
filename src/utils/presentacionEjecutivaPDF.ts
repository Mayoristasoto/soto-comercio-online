import jsPDF from 'jspdf';
import { PDF_STYLES, PDF_CONFIG, COMPANY_INFO } from './pdfStyles';

export const generatePresentacionEjecutivaPDF = async () => {
  const doc = new jsPDF(PDF_CONFIG);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 0;

  const addCenteredText = (text: string, y: number, fontSize: number, fontStyle: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // ============ SLIDE 1: PORTADA ============
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Logo
  try {
    const logo = await loadImage('/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png');
    const logoHeight = 25;
    const logoWidth = logoHeight * (logo.width / logo.height);
    doc.addImage(logo, 'PNG', (pageWidth - logoWidth) / 2, 30, logoWidth, logoHeight);
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  yPos = 70;
  doc.setTextColor(75, 13, 109); // Púrpura oscuro SOTO
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Sistema de Gestión de RRHH', yPos, 28, 'bold');
  
  yPos += 15;
  doc.setFontSize(18);
  doc.setTextColor(149, 25, 141); // Magenta SOTO
  addCenteredText('Transforme la gestión de su talento humano', yPos, 18, 'normal');

  // Línea decorativa
  doc.setDrawColor(224, 68, 3); // Naranja SOTO
  doc.setLineWidth(0.8);
  doc.line(pageWidth/2 - 40, yPos + 8, pageWidth/2 + 40, yPos + 8);

  yPos += 20;
  doc.setFontSize(14);
  doc.setTextColor(39, 44, 77);
  addCenteredText('Solución integral para empresas modernas', yPos, 14, 'normal');

  // Cuadro de beneficios
  yPos = pageHeight - 90;
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(149, 25, 141);
  doc.setLineWidth(0.5);
  doc.roundedRect(25, yPos, pageWidth - 50, 60, 3, 3, 'FD');
  
  doc.setTextColor(75, 13, 109);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  addCenteredText('BENEFICIOS CLAVE', yPos + 8, 11, 'bold');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(39, 44, 77);
  const beneficios = [
    'ROI en 6-8 meses | 70% menos tiempo administrativo',
    '85% precisión en control horario | 40% más engagement',
    'Reconocimiento facial avanzado | Gamificación integrada'
  ];
  
  let beneficioY = yPos + 20;
  beneficios.forEach(beneficio => {
    addCenteredText(beneficio, beneficioY, 9, 'normal');
    beneficioY += 8;
  });

  // ============ SLIDE 2: PROBLEMÁTICA ACTUAL ============
  doc.addPage();
  doc.setFillColor(255, 245, 245);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  yPos = 25;
  doc.setTextColor(75, 13, 109);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Desafíos Actuales en RRHH', yPos, 24, 'bold');

  yPos = 45;
  const desafios = [
    {
      titulo: 'Procesos Manuales',
      desc: '70% del tiempo se pierde en tareas administrativas repetitivas'
    },
    {
      titulo: 'Falta de Control',
      desc: 'Errores en fichajes y dificultad para verificar asistencia'
    },
    {
      titulo: 'Bajo Engagement',
      desc: 'Falta de reconocimiento y motivación del equipo'
    },
    {
      titulo: 'Sin Métricas',
      desc: 'Imposible medir productividad y tomar decisiones basadas en datos'
    }
  ];

  desafios.forEach((desafio, index) => {
    const boxY = yPos + (index * 45);
    
    // Borde izquierdo de color
    doc.setFillColor(224, 68, 3);
    doc.rect(20, boxY, 3, 35, 'F');
    
    // Fondo de la caja
    doc.setFillColor(255, 255, 255);
    doc.rect(23, boxY, pageWidth - 46, 35, 'F');
    
    // Contenido
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 13, 109);
    doc.text(desafio.titulo, 30, boxY + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(97, 110, 117);
    const lines = doc.splitTextToSize(desafio.desc, pageWidth - 60);
    doc.text(lines, 30, boxY + 20);
  });

  // ============ SLIDE 3: SOLUCIÓN ============
  doc.addPage();
  doc.setFillColor(248, 245, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  yPos = 25;
  doc.setTextColor(75, 13, 109);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Solución SOTO: Sistema Integral de RRHH', yPos, 22, 'bold');

  yPos = 45;
  const soluciones = [
    { titulo: 'Gestión Completa', desc: 'Nómina, documentos, evaluaciones en una plataforma' },
    { titulo: 'Máxima Seguridad', desc: 'Reconocimiento facial y control biométrico avanzado' },
    { titulo: 'Automatización', desc: 'Elimina tareas manuales y ahorra hasta 70% del tiempo' },
    { titulo: 'Reconocimiento', desc: 'Sistema de gamificación que aumenta engagement 40%' },
    { titulo: 'Analytics', desc: 'Dashboards en tiempo real para decisiones inteligentes' },
    { titulo: 'Planificación', desc: 'Gestión de vacaciones, horarios y turnos inteligente' }
  ];

  soluciones.forEach((sol, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 20 + (col * 90);
    const y = yPos + (row * 40);
    
    // Fondo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(149, 25, 141);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, 85, 35, 2, 2, 'FD');
    
    // Círculo de color
    const colors: [number, number, number][] = [
      [75, 13, 109],   // Púrpura
      [149, 25, 141],  // Magenta
      [224, 68, 3],    // Naranja
      [75, 13, 109],
      [149, 25, 141],
      [224, 68, 3]
    ];
    doc.setFillColor(...colors[index]);
    doc.circle(x + 10, y + 10, 5, 'F');
    
    // Texto
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 13, 109);
    doc.text(sol.titulo, x + 18, y + 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(97, 110, 117);
    const lines = doc.splitTextToSize(sol.desc, 70);
    doc.text(lines, x + 5, y + 20);
  });

  // ============ SLIDE 4: ROI Y BENEFICIOS ============
  doc.addPage();
  
  // Fondo con gradiente simulado
  doc.setFillColor(75, 13, 109);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(149, 25, 141, 0.3);
  doc.rect(0, 0, pageWidth, pageHeight/2, 'F');

  yPos = 25;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  addCenteredText('ROI y Beneficios Cuantificables', yPos, 24, 'bold');

  yPos = 50;
  const metricas = [
    { valor: '6-8', unidad: 'Meses', desc: 'de ROI' },
    { valor: '70%', unidad: 'Ahorro', desc: 'de tiempo' },
    { valor: '85%', unidad: 'Precisión', desc: 'en control' },
    { valor: '40%', unidad: 'Más', desc: 'engagement' }
  ];

  metricas.forEach((metrica, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 25 + (col * 95);
    const y = yPos + (row * 65);
    
    // Fondo blanco
    doc.setFillColor(255, 255, 255, 0.95);
    doc.roundedRect(x, y, 85, 55, 3, 3, 'F');
    
    // Valor grande
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 13, 109);
    const valorWidth = doc.getTextWidth(metrica.valor);
    doc.text(metrica.valor, x + (85 - valorWidth) / 2, y + 25);
    
    // Unidad
    doc.setFontSize(14);
    doc.setTextColor(149, 25, 141);
    const unidadWidth = doc.getTextWidth(metrica.unidad);
    doc.text(metrica.unidad, x + (85 - unidadWidth) / 2, y + 35);
    
    // Descripción
    doc.setFontSize(10);
    doc.setTextColor(97, 110, 117);
    const descWidth = doc.getTextWidth(metrica.desc);
    doc.text(metrica.desc, x + (85 - descWidth) / 2, y + 45);
  });

  // ============ SLIDE 5: MÓDULOS PRINCIPALES ============
  doc.addPage();
  doc.setFillColor(255, 250, 245);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  yPos = 25;
  doc.setTextColor(75, 13, 109);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Módulos Principales del Sistema', yPos, 22, 'bold');

  yPos = 45;
  const modulos: Array<{
    titulo: string;
    desc: string;
    features: string[];
    color: [number, number, number];
  }> = [
    {
      titulo: 'Control de Asistencia con Reconocimiento Facial',
      desc: 'Sistema biométrico avanzado que elimina suplantaciones y errores',
      features: ['85% precisión', 'Sin contacto físico', 'Reportes automáticos'],
      color: [75, 13, 109]
    },
    {
      titulo: 'Gestión de Nómina y Documentos',
      desc: 'Centraliza información, contratos, firmas digitales y trámites',
      features: ['Firma electrónica', 'Archivo digital', 'Alertas automáticas'],
      color: [149, 25, 141]
    },
    {
      titulo: 'Sistema de Reconocimiento y Gamificación',
      desc: 'Aumenta motivación con desafíos, insignias y premios canjeables',
      features: ['+40% engagement', 'Rankings en vivo', 'Premios reales'],
      color: [224, 68, 3]
    }
  ];

  modulos.forEach((modulo, index) => {
    const boxY = yPos + (index * 65);
    
    // Borde izquierdo de color
    doc.setFillColor(...modulo.color);
    doc.rect(20, boxY, 4, 55, 'F');
    
    // Fondo
    doc.setFillColor(255, 255, 255);
    doc.rect(24, boxY, pageWidth - 48, 55, 'F');
    
    // Título
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 13, 109);
    doc.text(modulo.titulo, 30, boxY + 10);
    
    // Descripción
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(97, 110, 117);
    const lines = doc.splitTextToSize(modulo.desc, pageWidth - 65);
    doc.text(lines, 30, boxY + 20);
    
    // Features
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    let featureX = 30;
    modulo.features.forEach(feature => {
      doc.text('✓ ' + feature, featureX, boxY + 40);
      featureX += 55;
    });
  });

  // ============ SLIDE 6: MÉTRICAS DE IMPACTO ============
  doc.addPage();
  doc.setFillColor(60, 20, 80);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  yPos = 25;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Impacto Medible en su Organización', yPos, 24, 'bold');

  yPos = 50;
  const impactos = [
    { label: 'Reducción Tiempo Administrativo', value: 70 },
    { label: 'Precisión en Control Horario', value: 85 },
    { label: 'Aumento de Engagement', value: 40 },
    { label: 'Reducción de Errores', value: 90 },
    { label: 'Satisfacción del Personal', value: 95 }
  ];

  impactos.forEach((impacto, index) => {
    const boxY = yPos + (index * 35);
    
    // Fondo semi-transparente
    doc.setFillColor(255, 255, 255, 0.1);
    doc.roundedRect(25, boxY, pageWidth - 50, 28, 2, 2, 'F');
    
    // Label
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(impacto.label, 30, boxY + 10);
    
    // Valor
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(impacto.value + '%', pageWidth - 35, boxY + 10);
    
    // Barra de progreso
    const barWidth = pageWidth - 60;
    const barHeight = 6;
    const barY = boxY + 16;
    
    // Fondo de la barra
    doc.setFillColor(255, 255, 255, 0.2);
    doc.roundedRect(30, barY, barWidth, barHeight, 1, 1, 'F');
    
    // Barra de progreso
    doc.setFillColor(224, 68, 3);
    doc.roundedRect(30, barY, (barWidth * impacto.value) / 100, barHeight, 1, 1, 'F');
  });

  // ============ SLIDE 7: PRÓXIMOS PASOS ============
  doc.addPage();
  doc.setFillColor(255, 245, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  yPos = 25;
  doc.setTextColor(75, 13, 109);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Comience su Transformación Digital', yPos, 24, 'bold');

  yPos = 50;
  const pasos = [
    {
      numero: '1',
      titulo: 'Demo Personalizada',
      desc: 'Conozca el sistema adaptado a sus necesidades'
    },
    {
      numero: '2',
      titulo: 'Prueba Piloto',
      desc: 'Implemente en un área específica sin riesgos'
    },
    {
      numero: '3',
      titulo: 'Implementación Total',
      desc: 'Despliegue completo con capacitación incluida'
    }
  ];

  const colores: [number, number, number][] = [
    [75, 13, 109],
    [149, 25, 141],
    [224, 68, 3]
  ];

  pasos.forEach((paso, index) => {
    const boxY = yPos + (index * 50);
    
    // Fondo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(149, 25, 141);
    doc.setLineWidth(0.8);
    doc.roundedRect(25, boxY, pageWidth - 50, 40, 3, 3, 'FD');
    
    // Número circular
    doc.setFillColor(...colores[index]);
    doc.circle(40, boxY + 20, 8, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const numWidth = doc.getTextWidth(paso.numero);
    doc.text(paso.numero, 40 - numWidth / 2, boxY + 24);
    
    // Título
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 13, 109);
    doc.text(paso.titulo, 55, boxY + 18);
    
    // Descripción
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(97, 110, 117);
    doc.text(paso.desc, 55, boxY + 28);
    
    // Flecha
    doc.setTextColor(149, 25, 141);
    doc.setFontSize(16);
    doc.text('→', pageWidth - 38, boxY + 22);
  });

  // Call to action
  yPos = pageHeight - 40;
  doc.setFillColor(75, 13, 109);
  doc.roundedRect((pageWidth - 100) / 2, yPos, 100, 20, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  addCenteredText('Solicitar Demo Ahora', yPos + 13, 14, 'bold');

  // Información de contacto
  doc.setFontSize(9);
  doc.setTextColor(97, 110, 117);
  addCenteredText('contacto@sotomayorista.com | www.sotomayorista.com', pageHeight - 15, 9, 'normal');

  // Footer con logo en todas las páginas (excepto portada)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Número de página
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`${i} / ${totalPages}`, pageWidth - 20, pageHeight - 10);
    
    // Línea decorativa en footer
    doc.setDrawColor(224, 68, 3);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
  }

  // Guardar el PDF
  doc.save('Presentacion_Ejecutiva_SOTO_RRHH.pdf');
};

// Helper function para cargar imágenes
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};
