import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_STYLES } from './pdfStyles';

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

  // PORTADA
  doc.setFillColor(37, 99, 235); // Primary color
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  addCenteredText('SISTEMA INTEGRAL DE', 35, 18, 'bold');
  addCenteredText('GESTIÓN DE RECURSOS HUMANOS', 45, 18, 'bold');
  
  doc.setFontSize(12);
  addCenteredText('Informe Ejecutivo de Funcionalidades y Beneficios', 60, 12, 'normal');

  doc.setTextColor(37, 99, 235);
  yPos = 100;
  addCenteredText('Transforme la gestión de su talento humano', yPos, 14, 'bold');
  yPos += 10;
  
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  addCenteredText('Solución completa para empresas modernas', yPos, 10, 'normal');

  // Logo placeholder area
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(pageWidth/2 - 30, 120, 60, 60);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  addCenteredText('LOGO EMPRESA', 155, 8, 'normal');

  // Footer de portada
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  addCenteredText(fecha, pageHeight - 15, 9, 'normal');

  // PÁGINA 2: RESUMEN EJECUTIVO
  doc.addPage();
  yPos = 20;
  
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Ejecutivo', 20, yPos);
  yPos += 15;

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
      doc.setTextColor(37, 99, 235);
    } else if (line.startsWith('•')) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(22, 163, 74); // Green for benefits
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }
    doc.text(line, 20, yPos);
    yPos += 6;
  });

  yPos += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, yPos, pageWidth - 20, yPos);

  // MÓDULOS PRINCIPALES
  yPos += 10;
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Módulos Principales', 20, yPos);
  yPos += 10;

  // PÁGINA 3: MÓDULO DE FICHERO
  doc.addPage();
  yPos = 20;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. CONTROL HORARIO Y ASISTENCIA', 22, yPos + 4);
  yPos += 20;

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

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Beneficios de Negocio:', 20, yPos);
  yPos += 7;

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
  yPos += 5;
  doc.setFillColor(240, 253, 244);
  doc.rect(20, yPos, pageWidth - 40, 25, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CASO DE USO:', 25, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const casoFichero = doc.splitTextToSize(
    'Empresa retail con 200 empleados redujo en 85% los errores de marcaje y ahorró $3,200 mensuales en costos administrativos al implementar el sistema de reconocimiento facial.',
    pageWidth - 50
  );
  doc.text(casoFichero, 25, yPos + 11);

  // PÁGINA 4: EVALUACIONES DE DESEMPEÑO
  doc.addPage();
  yPos = 20;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. EVALUACIONES DE DESEMPEÑO', 22, yPos + 4);
  yPos += 20;

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

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Beneficios de Negocio:', 20, yPos);
  yPos += 7;

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

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. GESTIÓN DE VACACIONES Y PERMISOS', 22, yPos + 4);
  yPos += 20;

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

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Beneficios de Negocio:', 20, yPos);
  yPos += 7;

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

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. GAMIFICACIÓN Y RECONOCIMIENTO', 22, yPos + 4);
  yPos += 20;

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

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('Beneficios de Negocio:', 20, yPos);
  yPos += 7;

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

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Módulos Adicionales', 20, yPos);
  yPos += 12;

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
      fillColor: [37, 99, 235],
      fontSize: 10,
      fontStyle: 'bold',
    },
    styles: { 
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 120 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // PÁGINA 8: TECNOLOGÍA Y SEGURIDAD
  checkNewPage();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Tecnología y Seguridad', 22, yPos + 4);
  yPos += 20;

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

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Retorno de Inversión (ROI)', 22, yPos + 4);
  yPos += 20;

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
      fillColor: [37, 99, 235],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: { 
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 45, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === roiData.length - 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 244];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFillColor(240, 253, 244);
  doc.rect(20, yPos, pageWidth - 40, 30, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ROI Promedio: 6-8 meses', 25, yPos + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const roiTexto = doc.splitTextToSize(
    'Los ahorros operativos y mejoras en productividad típicamente superan el costo de implementación en menos de 8 meses, generando valor continuo año tras año.',
    pageWidth - 50
  );
  doc.text(roiTexto, 25, yPos + 15);

  // PÁGINA 10: PROCESO DE IMPLEMENTACIÓN
  doc.addPage();
  yPos = 20;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Proceso de Implementación', 22, yPos + 4);
  yPos += 20;

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

  fases.forEach((fase, index) => {
    checkNewPage();
    
    doc.setFillColor(241, 245, 249);
    doc.rect(20, yPos, pageWidth - 40, 8, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(fase.fase, 25, yPos + 5.5);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`(${fase.duracion})`, pageWidth - 45, yPos + 5.5);
    yPos += 12;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    fase.actividades.forEach(act => {
      doc.text(`• ${act}`, 30, yPos);
      yPos += 5;
    });
    yPos += 5;
  });

  yPos += 5;
  doc.setFillColor(219, 234, 254);
  doc.rect(20, yPos, pageWidth - 40, 15, 'F');
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tiempo total de implementación: 5-8 semanas', 25, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Incluye soporte continuo y seguimiento post-implementación', 25, yPos + 11);

  // PÁGINA FINAL: CONTACTO Y PRÓXIMOS PASOS
  doc.addPage();
  yPos = 20;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, yPos - 5, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Próximos Pasos', 22, yPos + 4);
  yPos += 25;

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
  doc.setFillColor(240, 253, 244);
  doc.rect(20, yPos, pageWidth - 40, 40, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Oferta Especial', 25, yPos + 8);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const ofertaTexto = doc.splitTextToSize(
    'Primeros 3 meses con 30% de descuento para nuevos clientes. Incluye implementación, capacitación y soporte ilimitado durante el periodo de prueba.',
    pageWidth - 50
  );
  doc.text(ofertaTexto, 25, yPos + 16);

  yPos += 50;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Información de Contacto:', 20, yPos);
  yPos += 8;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Correo: info@sistemarrhh.com', 25, yPos);
  yPos += 6;
  doc.text('Teléfono: +1 (555) 123-4567', 25, yPos);
  yPos += 6;
  doc.text('Web: www.sistemarrhh.com', 25, yPos);

  yPos = pageHeight - 30;
  doc.setFillColor(241, 245, 249);
  doc.rect(20, yPos, pageWidth - 40, 20, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  addCenteredText('Gracias por su interés en nuestro Sistema de Gestión de RRHH', yPos + 8, 9, 'italic');
  addCenteredText('Estamos comprometidos con transformar la gestión de talento en su empresa', yPos + 13, 9, 'italic');

  // Agregar numeración de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  const fileName = `Informe_Ejecutivo_RRHH_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};
