import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_STYLES, COMPANY_INFO } from './pdfStyles';

export const generateInformeEjecutivoPDF = (): string => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Helper function to add centered text
  const addCenteredText = (text: string, y: number, fontSize: number, fontStyle: string = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number = 40) => {
    if (yPos > pageHeight - requiredSpace) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // PORTADA CON DISEÑO MODERNO
  // Gradiente de fondo (simulado con capas)
  doc.setFillColor(126, 34, 206); // Morado SOTO
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Efecto de gradiente con transparencias simuladas
  doc.setFillColor(225, 29, 72, 0.3); // Rosa semi-transparente
  doc.circle(pageWidth * 0.8, 50, 80, 'F');
  doc.setFillColor(249, 115, 22, 0.2); // Naranja semi-transparente
  doc.circle(pageWidth * 0.2, pageHeight * 0.7, 100, 'F');

  // Logo de la empresa
  try {
    const img = new Image();
    img.src = COMPANY_INFO.logo;
    doc.addImage(img, 'JPEG', pageWidth/2 - 40, 30, 80, 40);
  } catch (error) {
    console.log('Logo no disponible');
  }

  // Título principal
  doc.setTextColor(255, 255, 255);
  yPos = 90;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  addCenteredText('INFORME EJECUTIVO', yPos, 24, 'bold');
  
  yPos += 12;
  doc.setFontSize(16);
  addCenteredText('Sistema de Gestión de Recursos Humanos', yPos, 16, 'normal');

  // Línea decorativa
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(pageWidth/2 - 40, yPos + 8, pageWidth/2 + 40, yPos + 8);

  // Subtítulo
  yPos += 25;
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  addCenteredText('Transforme la gestión de su talento humano', yPos, 14, 'normal');
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(240, 240, 240);
  addCenteredText('Solución integral para empresas modernas', yPos, 12, 'normal');

  // Cuadro de beneficios destacados
  yPos = pageHeight - 90;
  doc.setFillColor(255, 255, 255, 0.95);
  doc.roundedRect(25, yPos, pageWidth - 50, 60, 3, 3, 'F');
  
  doc.setTextColor(126, 34, 206);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BENEFICIOS CLAVE', pageWidth/2, yPos + 8, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const beneficiosPortada = [
    '✓ ROI en 6-8 meses  •  ✓ 70% menos tiempo administrativo',
    '✓ 85% precisión en control horario  •  ✓ 40% más engagement'
  ];
  yPos += 18;
  beneficiosPortada.forEach(texto => {
    addCenteredText(texto, yPos, 9, 'normal');
    yPos += 7;
  });

  // Footer de portada
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  addCenteredText(fecha, pageHeight - 12, 9, 'normal');
  doc.setFontSize(8);
  addCenteredText(`${COMPANY_INFO.name} | Versión ${COMPANY_INFO.version}`, pageHeight - 7, 8, 'normal');

  // PÁGINA 2: RESUMEN EJECUTIVO
  doc.addPage();
  yPos = 20;
  
  // Header de sección con diseño moderno
  doc.setFillColor(126, 34, 206);
  doc.roundedRect(15, yPos - 8, pageWidth - 30, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Ejecutivo', 20, yPos + 2);
  yPos += 20;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const resumenTexto = [
    'Nuestro Sistema Integral de Gestión de Recursos Humanos es una solución completa que',
    'revoluciona la manera en que las empresas gestionan su capital humano. Con tecnología',
    'de vanguardia y una interfaz intuitiva, optimizamos cada aspecto de la gestión de personal.',
    '',
    'BENEFICIOS CLAVE:',
    '',
    '• Reducción de hasta 70% en tiempo administrativo',
    '• Mejora del 85% en precisión de control horario',
    '• Incremento del 40% en engagement de empleados',
    '• ROI positivo en menos de 6 meses',
    '• Ahorro promedio de 15-20 horas semanales por gerente',
  ];

  resumenTexto.forEach(line => {
    if (line.startsWith('BENEFICIOS')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(126, 34, 206);
      doc.setFontSize(12);
    } else if (line.startsWith('•')) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(225, 29, 72);
      doc.setFontSize(10);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
    }
    doc.text(line, 20, yPos);
    yPos += 6;
  });

  yPos += 8;
  // Línea decorativa con gradiente simulado
  doc.setDrawColor(126, 34, 206);
  doc.setLineWidth(1);
  doc.line(20, yPos, pageWidth - 20, yPos);

  // MÓDULOS PRINCIPALES con diseño destacado
  yPos += 12;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 12, 2, 2, 'F');
  doc.setTextColor(126, 34, 206);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Módulos Principales', 20, yPos + 4);
  yPos += 15;

  // PÁGINA 3: MÓDULO DE FICHERO
  doc.addPage();
  yPos = 20;

  // Header del módulo con gradiente
  doc.setFillColor(126, 34, 206);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. CONTROL HORARIO Y ASISTENCIA', 20, yPos + 3);
  yPos += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Funcionalidades:', 20, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const ficheroFunciones = [
    '✓ Registro biométrico con reconocimiento facial',
    '✓ Múltiples métodos de autenticación (facial, manual, kiosco)',
    '✓ Gestión inteligente de horarios y turnos',
    '✓ Control de horas extras y ausencias',
    '✓ Configuración de feriados y días especiales',
    '✓ Reportes de puntualidad y asistencia en tiempo real',
    '✓ Sistema de estado de ánimo para monitoreo de clima laboral',
  ];

  ficheroFunciones.forEach(func => {
    doc.text(func, 25, yPos);
    yPos += 6;
  });

  yPos += 8;
  // Caja de beneficios
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(18, yPos - 3, pageWidth - 36, 5, 1, 1, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text('Beneficios de Negocio:', 23, yPos + 1);
  yPos += 9;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const ficheroBeneficios = [
    '→ Eliminación de fraudes en marcajes (buddy punching)',
    '→ Precisión del 99.9% en registro de asistencia',
    '→ Reducción de 12 horas/semana en tareas administrativas',
    '→ Cumplimiento automático de normativas laborales',
    '→ Datos en tiempo real para toma de decisiones',
    '→ Mejora en planificación de personal y costos',
  ];

  ficheroBeneficios.forEach(beneficio => {
    doc.text(beneficio, 25, yPos);
    yPos += 6;
  });

  checkNewPage();
  yPos += 8;
  // Caso de uso destacado
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(18, yPos, pageWidth - 36, 28, 2, 2, 'F');
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.5);
  doc.roundedRect(18, yPos, pageWidth - 36, 28, 2, 2, 'S');
  doc.setTextColor(249, 115, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('💼 CASO DE ÉXITO:', 23, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  const casoFichero = doc.splitTextToSize(
    'Empresa retail con 200 empleados redujo en 85% los errores de marcaje y ahorró $3,200 mensuales en costos administrativos al implementar el sistema de reconocimiento facial.',
    pageWidth - 46
  );
  doc.text(casoFichero, 23, yPos + 12);

  // PÁGINA 4: EVALUACIONES DE DESEMPEÑO
  doc.addPage();
  yPos = 20;

  doc.setFillColor(225, 29, 72);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('2. EVALUACIONES DE DESEMPEÑO', 20, yPos + 3);
  yPos += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Funcionalidades:', 20, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const evalFunciones = [
    '✓ Sistema de calificaciones por QR para evaluación inmediata',
    '✓ Configuración flexible de conceptos evaluables',
    '✓ Evaluaciones 360° (autoevaluación, pares, superiores)',
    '✓ Métricas personalizables por puesto y departamento',
    '✓ Histórico completo de evaluaciones',
    '✓ Dashboard de rendimiento individual y por equipo',
    '✓ Alertas automáticas de bajo desempeño',
  ];

  evalFunciones.forEach(func => {
    doc.text(func, 25, yPos);
    yPos += 6;
  });

  yPos += 8;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(18, yPos - 3, pageWidth - 36, 5, 1, 1, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text('Beneficios de Negocio:', 23, yPos + 1);
  yPos += 9;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const evalBeneficios = [
    '→ Proceso de evaluación 90% más rápido',
    '→ Feedback en tiempo real mejora productividad en 35%',
    '→ Identificación temprana de necesidades de capacitación',
    '→ Reducción de 60% en tiempo de reuniones de evaluación',
    '→ Decisiones basadas en datos objetivos',
    '→ Mejora en retención de talento clave',
  ];

  evalBeneficios.forEach(beneficio => {
    doc.text(beneficio, 25, yPos);
    yPos += 6;
  });

  // PÁGINA 5: GESTIÓN DE VACACIONES
  doc.addPage();
  yPos = 20;

  doc.setFillColor(249, 115, 22);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('3. GESTIÓN DE VACACIONES Y PERMISOS', 20, yPos + 3);
  yPos += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Funcionalidades:', 20, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const vacFunciones = [
    '✓ Solicitud y aprobación de vacaciones en línea',
    '✓ Calendario visual de disponibilidad de equipo',
    '✓ Cálculo automático de días disponibles',
    '✓ Gestión de bloqueos por temporada alta',
    '✓ Workflow de aprobaciones multinivel',
    '✓ Notificaciones automáticas',
    '✓ Historial completo de solicitudes',
  ];

  vacFunciones.forEach(func => {
    doc.text(func, 25, yPos);
    yPos += 6;
  });

  yPos += 8;
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(18, yPos - 3, pageWidth - 36, 5, 1, 1, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(249, 115, 22);
  doc.text('Beneficios de Negocio:', 23, yPos + 1);
  yPos += 9;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const vacBeneficios = [
    '→ Reducción de 85% en tiempo de gestión de ausencias',
    '→ Eliminación de conflictos de cobertura',
    '→ Mayor transparencia en proceso de aprobación',
    '→ Planificación óptima de recursos',
    '→ Cumplimiento legal automático',
  ];

  vacBeneficios.forEach(beneficio => {
    doc.text(beneficio, 25, yPos);
    yPos += 6;
  });

  // PÁGINA 6: GAMIFICACIÓN Y ENGAGEMENT
  yPos += 10;
  checkNewPage();

  doc.setFillColor(126, 34, 206);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('4. GAMIFICACIÓN Y RECONOCIMIENTO', 20, yPos + 3);
  yPos += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Funcionalidades:', 20, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const gamFunciones = [
    '✓ Sistema de puntos por logros y desempeño',
    '✓ Insignias y medallas personalizables',
    '✓ Rankings y competencias saludables',
    '✓ Desafíos individuales y por equipo',
    '✓ Catálogo de premios canjeables',
    '✓ Celebración de cumpleaños y aniversarios',
    '✓ Pantalla de reconocimientos para TV',
  ];

  gamFunciones.forEach(func => {
    doc.text(func, 25, yPos);
    yPos += 6;
  });

  yPos += 8;
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(18, yPos - 3, pageWidth - 36, 5, 1, 1, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(126, 34, 206);
  doc.text('Beneficios de Negocio:', 23, yPos + 1);
  yPos += 9;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const gamBeneficios = [
    '→ Incremento de 40% en engagement de empleados',
    '→ Reducción de 25% en rotación de personal',
    '→ Mejora en clima organizacional',
    '→ Mayor motivación y productividad',
    '→ Cultura de reconocimiento continuo',
  ];

  gamBeneficios.forEach(beneficio => {
    doc.text(beneficio, 25, yPos);
    yPos += 6;
  });

  // PÁGINA 7: OTROS MÓDULOS
  doc.addPage();
  yPos = 20;

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 12, 2, 2, 'F');
  doc.setTextColor(126, 34, 206);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Módulos Adicionales', 20, yPos + 4);
  yPos += 18;

  // Tabla de módulos adicionales
  const modulosData = [
    ['Gestión de Documentos', 'Control de documentación, firma digital, vencimientos'],
    ['Capacitaciones', 'Programación, seguimiento y certificaciones'],
    ['Gestión de Gondolas', 'Control visual de exhibición de productos'],
    ['Tareas y Seguimiento', 'Asignación, delegación y tracking de tareas'],
    ['Solicitudes', 'Workflow configurable para cualquier tipo de solicitud'],
    ['Anotaciones', 'Registro de incidencias y observaciones'],
    ['Organigrama', 'Visualización jerárquica de la estructura'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Módulo', 'Descripción']],
    body: modulosData,
    theme: 'striped',
    headStyles: { 
      fillColor: [126, 34, 206],
      fontSize: 11,
      fontStyle: 'bold',
      textColor: [255, 255, 255],
    },
    styles: { 
      fontSize: 9,
      cellPadding: 5,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [126, 34, 206] },
      1: { cellWidth: 120 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // PÁGINA 8: TECNOLOGÍA Y SEGURIDAD
  checkNewPage();

  doc.setFillColor(88, 28, 135);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Tecnología y Seguridad', 20, yPos + 3);
  yPos += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Infraestructura Tecnológica:', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const techItems = [
    '• Arquitectura cloud escalable y de alto rendimiento',
    '• Base de datos PostgreSQL con Supabase',
    '• Interfaz responsive (móvil, tablet, desktop)',
    '• API REST para integraciones',
    '• Actualizaciones automáticas sin interrupciones',
  ];

  techItems.forEach(item => {
    doc.text(item, 25, yPos);
    yPos += 6;
  });

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Seguridad y Privacidad:', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const secItems = [
    '• Encriptación de extremo a extremo',
    '• Autenticación multifactor',
    '• Control de acceso basado en roles (RBAC)',
    '• Auditoría completa de acciones',
    '• Cumplimiento GDPR y normativas locales',
    '• Backups automáticos diarios',
    '• Certificación SSL/TLS',
  ];

  secItems.forEach(item => {
    doc.text(item, 25, yPos);
    yPos += 6;
  });

  // PÁGINA 9: ROI Y MÉTRICAS
  doc.addPage();
  yPos = 20;

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Retorno de Inversión (ROI)', 20, yPos + 3);
  yPos += 22;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ahorro Estimado por Empresa de 100 Empleados:', 20, yPos);
  yPos += 10;

  const roiData = [
    ['Concepto', 'Ahorro Mensual', 'Ahorro Anual'],
    ['Tiempo administrativo de RRHH', '$2,500', '$30,000'],
    ['Eliminación de fraudes de marcaje', '$1,200', '$14,400'],
    ['Optimización de horas extras', '$1,800', '$21,600'],
    ['Reducción de rotación', '$2,000', '$24,000'],
    ['Eficiencia en procesos', '$1,500', '$18,000'],
    ['TOTAL ESTIMADO', '$9,000', '$108,000'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [roiData[0]],
    body: roiData.slice(1),
    theme: 'grid',
    headStyles: { 
      fillColor: [16, 185, 129],
      fontSize: 10,
      fontStyle: 'bold',
      textColor: [255, 255, 255],
    },
    styles: { 
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === roiData.length - 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = [21, 128, 61];
        data.cell.styles.fontSize = 10;
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Destacado ROI
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(18, yPos, pageWidth - 36, 32, 2, 2, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.roundedRect(18, yPos, pageWidth - 36, 32, 2, 2, 'S');
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ ROI Promedio: 6-8 meses', 25, yPos + 9);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const roiTexto = doc.splitTextToSize(
    'Los ahorros operativos y mejoras en productividad típicamente superan el costo de implementación en menos de 8 meses, generando valor continuo año tras año.',
    pageWidth - 46
  );
  doc.text(roiTexto, 25, yPos + 16);

  // PÁGINA 10: PROCESO DE IMPLEMENTACIÓN
  doc.addPage();
  yPos = 20;

  doc.setFillColor(59, 130, 246);
  doc.roundedRect(0, yPos - 8, pageWidth, 16, 0, 0, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Proceso de Implementación', 20, yPos + 3);
  yPos += 22;

  const fases = [
    {
      fase: 'Fase 1: Configuración Inicial',
      duracion: '1-2 semanas',
      actividades: [
        'Carga de estructura organizacional',
        'Configuración de roles y permisos',
        'Importación de datos de empleados',
        'Personalización de la plataforma',
      ],
    },
    {
      fase: 'Fase 2: Capacitación',
      duracion: '1 semana',
      actividades: [
        'Capacitación a administradores',
        'Capacitación a gerentes',
        'Sesiones de onboarding para empleados',
        'Material de soporte y guías',
      ],
    },
    {
      fase: 'Fase 3: Piloto',
      duracion: '2-3 semanas',
      actividades: [
        'Prueba con grupo reducido',
        'Ajustes y optimización',
        'Validación de procesos',
        'Feedback y mejoras',
      ],
    },
    {
      fase: 'Fase 4: Lanzamiento',
      duracion: '1 semana',
      actividades: [
        'Rollout a toda la organización',
        'Soporte intensivo',
        'Monitoreo continuo',
        'Estabilización',
      ],
    },
  ];

  const coloresFases = [
    [126, 34, 206],
    [225, 29, 72],
    [249, 115, 22],
    [16, 185, 129],
  ];

  fases.forEach((fase, index) => {
    checkNewPage();
    
    const color = coloresFases[index];
    doc.setFillColor(color[0], color[1], color[2], 0.1);
    doc.roundedRect(18, yPos, pageWidth - 36, 10, 1, 1, 'F');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(fase.fase, 23, yPos + 6.5);
    doc.setFontSize(9);
    doc.text(`(${fase.duracion})`, pageWidth - 40, yPos + 6.5);
    yPos += 14;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    fase.actividades.forEach(act => {
      doc.text(`✓ ${act}`, 28, yPos);
      yPos += 5.5;
    });
    yPos += 6;
  });

  yPos += 5;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(18, yPos, pageWidth - 36, 18, 2, 2, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(18, yPos, pageWidth - 36, 18, 2, 2, 'S');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('⏱️ Tiempo total de implementación: 5-8 semanas', 23, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Incluye soporte continuo y seguimiento post-implementación', 23, yPos + 13);

  // PÁGINA FINAL: CONTACTO Y PRÓXIMOS PASOS
  doc.addPage();
  
  // Header con gradiente
  doc.setFillColor(126, 34, 206);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  yPos = 25;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Próximos Pasos', yPos, 20, 'bold');
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  addCenteredText('Comience su transformación digital hoy', yPos, 11, 'normal');
  
  yPos = 75;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('¿Cómo podemos ayudarle?', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const pasos = [
    '1. Agende una demostración personalizada para su empresa',
    '2. Reciba una propuesta adaptada a sus necesidades específicas',
    '3. Inicie con un piloto de bajo riesgo',
    '4. Experimente los beneficios en tiempo real',
  ];

  pasos.forEach(paso => {
    doc.text(paso, 25, yPos);
    yPos += 8;
  });

  yPos += 10;
  // Oferta destacada
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(18, yPos, pageWidth - 36, 42, 3, 3, 'F');
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(1);
  doc.roundedRect(18, yPos, pageWidth - 36, 42, 3, 3, 'S');
  doc.setTextColor(249, 115, 22);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('🎁 Oferta Especial', 25, yPos + 10);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const ofertaTexto = doc.splitTextToSize(
    'Primeros 3 meses con 30% de descuento para nuevos clientes. Incluye implementación, capacitación y soporte ilimitado durante el periodo de prueba.',
    pageWidth - 46
  );
  doc.text(ofertaTexto, 25, yPos + 18);

  yPos += 50;
  
  // Sección de contacto con diseño moderno
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(18, yPos, pageWidth - 36, 40, 2, 2, 'F');
  
  yPos += 10;
  doc.setTextColor(126, 34, 206);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  addCenteredText('Información de Contacto', yPos, 13, 'bold');
  yPos += 10;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addCenteredText('📧 info@sotomayorista.com', yPos, 10, 'normal');
  yPos += 7;
  addCenteredText('📞 +54 (11) 1234-5678', yPos, 10, 'normal');
  yPos += 7;
  addCenteredText('🌐 www.sotomayorista.com', yPos, 10, 'normal');

  // Footer elegante
  yPos = pageHeight - 35;
  doc.setFillColor(126, 34, 206);
  doc.rect(0, yPos, pageWidth, 35, 'F');
  
  yPos += 12;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  addCenteredText(`Gracias por su interés en ${COMPANY_INFO.name}`, yPos, 10, 'bold');
  yPos += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  addCenteredText('Estamos comprometidos con transformar la gestión de talento en su empresa', yPos, 9, 'normal');

  // Agregar numeración de páginas con diseño mejorado
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${COMPANY_INFO.name}`, 20, pageHeight - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
  }

  const fileName = `Informe_Ejecutivo_${COMPANY_INFO.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};
