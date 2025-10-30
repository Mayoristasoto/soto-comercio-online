import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_STYLES, PDF_CONFIG, COMPANY_INFO } from './pdfStyles';

export const generateEmpleadoPermisosPDF = () => {
  const doc = new jsPDF(PDF_CONFIG);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = PDF_STYLES.spacing.page.top;

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
    const pageCount = doc.internal.pages.length - 1;
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
  yPosition = pageHeight / 3;
  
  // Título principal
  addCenteredText(COMPANY_INFO.name, yPosition, PDF_STYLES.fonts.title, PDF_STYLES.colors.primary);
  yPosition += 15;

  // Título del documento
  addCenteredText(COMPANY_INFO.documentTitle, yPosition, PDF_STYLES.fonts.subtitle, PDF_STYLES.colors.secondary);
  yPosition += 10;

  // Línea decorativa
  doc.setDrawColor(PDF_STYLES.colors.border);
  doc.line(pageWidth / 4, yPosition, (3 * pageWidth) / 4, yPosition);
  yPosition += 20;

  // Fecha de generación
  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  addCenteredText(`Fecha de generación: ${today}`, yPosition, PDF_STYLES.fonts.body);
  yPosition += 8;
  addCenteredText(`Versión: ${COMPANY_INFO.version}`, yPosition, PDF_STYLES.fonts.body);

  addPageNumber();

  // === ÍNDICE ===
  doc.addPage();
  yPosition = PDF_STYLES.spacing.page.top;
  addPageNumber();

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('Índice', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  const tableOfContents = [
    '1. Descripción General del Rol',
    '2. Funciones Disponibles (12)',
    '3. Acciones Permitidas (10)',
    '4. Restricciones de Seguridad (8)',
    '5. Seguridad y Privacidad',
    '6. Preguntas Frecuentes',
  ];

  doc.setFontSize(PDF_STYLES.fonts.body);
  doc.setTextColor(PDF_STYLES.colors.text);
  tableOfContents.forEach((item) => {
    doc.text(`• ${item}`, PDF_STYLES.spacing.page.left + 5, yPosition);
    yPosition += 8;
  });

  // === SECCIÓN 1: DESCRIPCIÓN GENERAL ===
  doc.addPage();
  yPosition = PDF_STYLES.spacing.page.top;
  addPageNumber();

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('1. Descripción General del Rol', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  doc.setFontSize(PDF_STYLES.fonts.body);
  doc.setTextColor(PDF_STYLES.colors.text);
  const descripcion = [
    'El rol de Empleado está diseñado para proporcionar acceso a las herramientas',
    'necesarias para el desempeño diario de las funciones laborales, manteniendo la',
    'seguridad y privacidad de la información personal y de otros colaboradores.',
    '',
    'Características principales:',
    '• Acceso personalizado a información propia',
    '• Herramientas de autogestión y desarrollo',
    '• Sistema de reconocimientos y gamificación',
    '• Seguridad mediante Row-Level Security (RLS)',
  ];

  descripcion.forEach((line) => {
    doc.text(line, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 6;
  });

  // === SECCIÓN 2: FUNCIONES DISPONIBLES ===
  doc.addPage();
  yPosition = PDF_STYLES.spacing.page.top;
  addPageNumber();

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('2. Funciones Disponibles', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  const funciones = [
    {
      titulo: '1. Dashboard Personal',
      descripcion: 'Vista personalizada con estadísticas, tareas pendientes, próximas capacitaciones y resumen de actividades.',
    },
    {
      titulo: '2. Tareas Asignadas',
      descripcion: 'Visualización y gestión de tareas asignadas por supervisores con fechas límite y seguimiento de estado.',
    },
    {
      titulo: '3. Documentos',
      descripcion: 'Acceso a documentos personales, manuales, políticas de la empresa y documentos firmados.',
    },
    {
      titulo: '4. Capacitaciones',
      descripcion: 'Materiales de entrenamiento, cursos en línea, evaluaciones y seguimiento de progreso educativo.',
    },
    {
      titulo: '5. Medallas e Insignias',
      descripcion: 'Sistema de reconocimientos por logros, desempeño destacado y cumplimiento de objetivos.',
    },
    {
      titulo: '6. Calificaciones',
      descripcion: 'Visualización de evaluaciones de clientes y supervisores sobre el desempeño laboral.',
    },
    {
      titulo: '7. Entregas de Elementos',
      descripcion: 'Confirmación de recepción de uniformes, herramientas y equipamiento con firma digital.',
    },
    {
      titulo: '8. Premios Disponibles',
      descripcion: 'Catálogo de premios canjeables con puntos acumulados por desempeño y participación.',
    },
    {
      titulo: '9. Desafíos Activos',
      descripcion: 'Participación en retos y desafíos con otros colaboradores para ganar puntos y reconocimientos.',
    },
    {
      titulo: '10. Ranking',
      descripcion: 'Visualización de posición en rankings por desempeño, puntualidad y participación en actividades.',
    },
    {
      titulo: '11. Eventos del Equipo',
      descripcion: 'Información sobre eventos, reuniones, celebraciones y actividades de integración del equipo.',
    },
    {
      titulo: '12. Fichaje y Asistencia',
      descripcion: 'Consulta de historial de fichajes, horarios asignados, estadísticas de puntualidad (registro desde kiosco).',
    },
  ];

  funciones.forEach((funcion, index) => {
    checkNewPage(25);
    
    doc.setFontSize(PDF_STYLES.fonts.heading);
    doc.setTextColor(PDF_STYLES.colors.primary);
    doc.text(`${funcion.titulo}`, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 7;

    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setTextColor(PDF_STYLES.colors.text);
    const splitDesc = doc.splitTextToSize(funcion.descripcion, pageWidth - 2 * PDF_STYLES.spacing.page.left);
    doc.text(splitDesc, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += splitDesc.length * 5 + 8;
  });

  // === SECCIÓN 3: ACCIONES PERMITIDAS ===
  checkNewPage(40);
  yPosition += 10;

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('3. Acciones Permitidas', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  const acciones = [
    {
      titulo: 'Marcar Tareas como Completadas',
      descripcion: 'Actualizar el estado de las tareas asignadas una vez finalizadas.',
    },
    {
      titulo: 'Firmar Documentos Digitalmente',
      descripcion: 'Firmar documentos requeridos con firma digital legal y trazable.',
    },
    {
      titulo: 'Completar Capacitaciones',
      descripcion: 'Realizar cursos asignados y obtener certificaciones.',
    },
    {
      titulo: 'Confirmar Recepción de Elementos',
      descripcion: 'Registrar la recepción de uniformes y herramientas entregadas.',
    },
    {
      titulo: 'Canjear Premios',
      descripcion: 'Utilizar puntos acumulados para obtener premios del catálogo.',
    },
    {
      titulo: 'Participar en Desafíos',
      descripcion: 'Inscribirse y completar desafíos para ganar reconocimientos.',
    },
    {
      titulo: 'Registrar Fichaje (solo desde kiosco)',
      descripcion: 'Marcar entrada/salida usando reconocimiento facial en el kiosco.',
    },
    {
      titulo: 'Solicitar Vacaciones',
      descripcion: 'Crear solicitudes de días de descanso según disponibilidad.',
    },
    {
      titulo: 'Crear Solicitudes',
      descripcion: 'Generar solicitudes de permisos, cambios de turno u otros requerimientos.',
    },
    {
      titulo: 'Descargar Documentos Personales',
      descripcion: 'Obtener copias de contratos, recibos de pago y documentos propios.',
    },
  ];

  acciones.forEach((accion) => {
    checkNewPage(20);
    
    doc.setFontSize(PDF_STYLES.fonts.heading);
    doc.setTextColor(PDF_STYLES.colors.success);
    doc.text(accion.titulo, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 7;

    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setTextColor(PDF_STYLES.colors.text);
    const splitDesc = doc.splitTextToSize(accion.descripcion, pageWidth - 2 * PDF_STYLES.spacing.page.left);
    doc.text(splitDesc, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += splitDesc.length * 5 + 7;
  });

  // === SECCIÓN 4: RESTRICCIONES ===
  checkNewPage(40);
  yPosition += 10;

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('4. Restricciones de Seguridad', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  const restricciones = [
    {
      titulo: 'Sin Acceso a Datos de Otros Empleados',
      descripcion: 'Por privacidad, no puede ver información personal, tareas o documentos de otros colaboradores.',
    },
    {
      titulo: 'Sin Acceso a Configuración del Sistema',
      descripcion: 'No puede modificar parámetros globales, reglas de negocio o configuraciones de la plataforma.',
    },
    {
      titulo: 'Sin Gestión de Usuarios',
      descripcion: 'No puede crear, editar o eliminar cuentas de usuarios del sistema.',
    },
    {
      titulo: 'Sin Asignación de Tareas',
      descripcion: 'No puede crear ni asignar tareas a otros empleados, solo gestionar las propias.',
    },
    {
      titulo: 'Sin Gestión de Sucursales',
      descripcion: 'No puede administrar información de sucursales, horarios ni asignaciones de personal.',
    },
    {
      titulo: 'Sin Acceso a Reportes Generales',
      descripcion: 'No puede generar reportes consolidados de toda la empresa o de otras áreas.',
    },
    {
      titulo: 'Sin Gestión de Presupuestos',
      descripcion: 'No tiene acceso a información financiera o presupuestos de la empresa.',
    },
    {
      titulo: 'Sin Aprobación de Solicitudes',
      descripcion: 'No puede aprobar o rechazar solicitudes de vacaciones, permisos u otros colaboradores.',
    },
  ];

  restricciones.forEach((restriccion) => {
    checkNewPage(20);
    
    doc.setFontSize(PDF_STYLES.fonts.heading);
    doc.setTextColor(PDF_STYLES.colors.danger);
    doc.text(restriccion.titulo, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 7;

    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setTextColor(PDF_STYLES.colors.text);
    const splitDesc = doc.splitTextToSize(restriccion.descripcion, pageWidth - 2 * PDF_STYLES.spacing.page.left);
    doc.text(splitDesc, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += splitDesc.length * 5 + 7;
  });

  // === SECCIÓN 5: SEGURIDAD Y PRIVACIDAD ===
  checkNewPage(50);
  yPosition += 10;

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('5. Seguridad y Privacidad', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  doc.setFontSize(PDF_STYLES.fonts.body);
  doc.setTextColor(PDF_STYLES.colors.text);

  const seguridadInfo = [
    'Row-Level Security (RLS)',
    'Cada registro en la base de datos está protegido para que solo pueda ser',
    'accedido por el empleado propietario o administradores autorizados.',
    '',
    'Auditoría de Acciones',
    'Todas las acciones importantes quedan registradas con fecha, hora y usuario',
    'para mantener trazabilidad y transparencia.',
    '',
    'Protección de Datos Personales',
    'La información personal está encriptada y solo es visible para el empleado',
    'y el departamento de recursos humanos según sea necesario.',
    '',
    'Acceso Limitado de Administradores',
    'Los administradores solo acceden a información específica cuando es',
    'estrictamente necesario para tareas de gestión y soporte.',
  ];

  seguridadInfo.forEach((line) => {
    if (line === 'Row-Level Security (RLS)' || line === 'Auditoría de Acciones' || 
        line === 'Protección de Datos Personales' || line === 'Acceso Limitado de Administradores') {
      checkNewPage(25);
      yPosition += 5;
      doc.setFontSize(PDF_STYLES.fonts.heading);
      doc.setTextColor(PDF_STYLES.colors.primary);
    } else {
      doc.setFontSize(PDF_STYLES.fonts.body);
      doc.setTextColor(PDF_STYLES.colors.text);
    }
    doc.text(line, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 6;
  });

  // === SECCIÓN 6: PREGUNTAS FRECUENTES ===
  doc.addPage();
  yPosition = PDF_STYLES.spacing.page.top;
  addPageNumber();

  doc.setFontSize(PDF_STYLES.fonts.subtitle);
  doc.setTextColor(PDF_STYLES.colors.primary);
  doc.text('6. Preguntas Frecuentes', PDF_STYLES.spacing.page.left, yPosition);
  yPosition += 12;

  const faqs = [
    {
      pregunta: '¿Cómo recupero mi contraseña?',
      respuesta: 'Contacte al departamento de RRHH para solicitar un restablecimiento de contraseña seguro.',
    },
    {
      pregunta: '¿Puedo ver el fichaje de mis compañeros?',
      respuesta: 'No, por privacidad solo puede ver su propio historial de fichajes y asistencia.',
    },
    {
      pregunta: '¿Dónde registro mi fichaje?',
      respuesta: 'Los fichajes deben realizarse únicamente desde el kiosco de la empresa usando reconocimiento facial.',
    },
    {
      pregunta: '¿Cómo solicito vacaciones?',
      respuesta: 'Desde la sección "Vacaciones" puede crear solicitudes que serán evaluadas por su supervisor.',
    },
    {
      pregunta: '¿Qué hago si no aparece un documento?',
      respuesta: 'Contacte a RRHH para verificar que el documento haya sido asignado correctamente a su perfil.',
    },
    {
      pregunta: '¿Puedo cambiar mi rol?',
      respuesta: 'Los cambios de rol solo pueden ser realizados por administradores de RRHH según necesidades organizacionales.',
    },
  ];

  faqs.forEach((faq) => {
    checkNewPage(25);
    
    doc.setFontSize(PDF_STYLES.fonts.heading);
    doc.setTextColor(PDF_STYLES.colors.accent);
    doc.text(`P: ${faq.pregunta}`, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += 7;

    doc.setFontSize(PDF_STYLES.fonts.body);
    doc.setTextColor(PDF_STYLES.colors.text);
    const splitResp = doc.splitTextToSize(`R: ${faq.respuesta}`, pageWidth - 2 * PDF_STYLES.spacing.page.left);
    doc.text(splitResp, PDF_STYLES.spacing.page.left, yPosition);
    yPosition += splitResp.length * 5 + 10;
  });

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
  addCenteredText(`${today} - Versión ${COMPANY_INFO.version}`, yPosition, PDF_STYLES.fonts.small);
  yPosition += 5;
  addCenteredText('Para consultas o cambios, contacte al departamento de Recursos Humanos', yPosition, PDF_STYLES.fonts.small);

  // Guardar PDF
  const fileName = `Rol_Empleado_Descripcion_Funciones_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};
