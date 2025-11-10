import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CheckSquare, 
  GraduationCap, 
  FileText, 
  Award, 
  Star, 
  Package, 
  Calendar, 
  Menu, 
  LogOut,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  Lock,
  Plane,
  Download,
  MessageCircleQuestion,
  Clock,
  Shield,
  KeyRound
} from "lucide-react";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EmpleadoInstructivoProps {
  empleadoNombre?: string;
  empleadoApellido?: string;
  empleadoEmail?: string;
}

export const EmpleadoInstructivo = ({ empleadoNombre, empleadoApellido, empleadoEmail }: EmpleadoInstructivoProps) => {
  const { toast } = useToast();
  const [screenshots, setScreenshots] = useState<Record<string, string>>({});

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    const { data, error } = await supabase
      .from('instructivo_screenshots')
      .select('*');
    
    if (data) {
      const screenshotsMap = data.reduce((acc, item) => {
        acc[item.seccion] = item.imagen_url;
        return acc;
      }, {} as Record<string, string>);
      setScreenshots(screenshotsMap);
    }
  };

  const generarPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      // Título principal
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Guía Rápida para Empleados', margin, yPosition);
      yPosition += 10;

      // Información del empleado
      if (empleadoNombre && empleadoApellido && empleadoEmail) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Empleado: ${empleadoNombre} ${empleadoApellido}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Usuario/Email: ${empleadoEmail}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Contraseña: La que estableciste en tu primer acceso`, margin, yPosition);
        yPosition += 10;
      }

      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      const addSection = (title: string, content: string[]) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        content.forEach(item => {
          const lines = doc.splitTextToSize(item, maxWidth);
          lines.forEach((line: string) => {
            if (yPosition > 280) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
        });
        yPosition += 5;
      };

      // Secciones del instructivo
      addSection('1. Como Iniciar Sesion', [
        '* Ingresa tu correo electronico corporativo',
        '* Escribe tu contrasena personal',
        '* Haz clic en "Iniciar Sesion"',
        '* Si es tu primer acceso, el sistema te pedira cambiar tu contrasena',
        '',
        'Requisitos de contrasena (primer acceso):',
        '  - Minimo 8 caracteres',
        '  - Al menos una letra mayuscula',
        '  - Al menos un numero',
        '  - Al menos un caracter especial (!@#$%)',
        '',
        '[!] IMPORTANTE: Guarda tu contrasena en un lugar seguro'
      ]);

      addSection('2. Tu Dashboard Personal', [
        'El dashboard es tu pagina principal donde veras:',
        '* Resumen de tus tareas pendientes y completadas',
        '* Capacitaciones activas y proximas',
        '* Documentos que debes firmar o revisar',
        '* Tus puntos y reconocimientos actuales',
        '',
        '[i] TIP: Revisa tu dashboard diariamente para estar al dia'
      ]);

      addSection('3. Gestion de Tareas', [
        'Que puedes hacer?',
        '* Ver todas las tareas que te han asignado',
        '* Marcar tareas como completadas',
        '* Ver fechas limite y prioridades',
        '* Acceder desde el menu lateral -> "Mis Tareas"',
        '',
        'Accion rapida: Haz clic en cualquier tarea para ver mas detalles o marcarla como finalizada.'
      ]);

      addSection('4. Capacitaciones', [
        'Tu desarrollo profesional:',
        '* Accede a capacitaciones asignadas',
        '* Revisa materiales de formacion',
        '* Marca capacitaciones como completadas',
        '* Ve tu historial de formacion',
        '',
        '[i] TIP: Completar capacitaciones puede sumar puntos a tu perfil'
      ]);

      addSection('5. Documentos', [
        'Gestiona tu documentacion:',
        '* Firma documentos obligatorios digitalmente',
        '* Descarga copias de documentos firmados',
        '* Ve el estado de cada documento (pendiente/firmado)',
        '* Recibe notificaciones de nuevos documentos',
        '',
        '[!] IMPORTANTE: Algunos documentos son obligatorios y deben firmarse en un plazo determinado.'
      ]);

      addSection('6. Solicitar Vacaciones', [
        'Como solicitar tus vacaciones:',
        '* Ve a "Vacaciones" en el menu lateral',
        '* Haz clic en "Solicitar Vacaciones"',
        '* Selecciona las fechas de inicio y fin',
        '* Verifica cuantos dias disponibles tienes',
        '* Agrega un comentario si es necesario',
        '* Envia la solicitud y espera aprobacion',
        '',
        '[!] Planifica con anticipacion: Las solicitudes deben hacerse con al menos 15 dias de anticipacion.',
        '[i] Seguimiento: Puedes ver el estado de tus solicitudes (pendiente, aprobada, rechazada) en la misma seccion.',
        '[i] Revisa tu saldo de dias disponibles antes de solicitar'
      ]);

      addSection('7. Sistema de Fichaje - Entrada y Salida', [
        'Registro de asistencia:',
        '* Registra tu entrada al inicio de tu turno',
        '* Registra tu salida al finalizar tu jornada',
        '* El sistema puede usar reconocimiento facial (si esta habilitado)',
        '* Puedes ver tu historial de fichajes',
        '',
        'Proceso de entrada:',
        '  1. Ingresa al kiosco de fichaje o usa tu panel de empleado',
        '  2. Verifica que sea tu turno programado',
        '  3. Confirma tu identidad (facial o manual)',
        '  4. El sistema registra automaticamente la hora de entrada',
        '',
        'Proceso de salida:',
        '  1. Ve al kiosco o panel antes de finalizar tu turno',
        '  2. Confirma las tareas completadas del dia (si aplica)',
        '  3. Registra tu estado de animo (opcional)',
        '  4. Confirma tu salida',
        '',
        '[!] IMPORTANTE: Registra puntualmente para mantener control preciso de asistencia',
        '[i] Si olvidas fichar, contacta a tu supervisor para registro manual'
      ]);

      addSection('8. Confirmar Entregas de Elementos', [
        'Gestion de equipos y uniformes:',
        '* Revisa elementos pendientes de confirmar en "Entregas"',
        '* Lee cuidadosamente la descripcion de cada elemento',
        '* Verifica tallas, cantidades y estado',
        '* Firma digitalmente para confirmar recepcion',
        '',
        'Proceso de confirmacion:',
        '  1. Ve a la seccion "Entregas de Elementos"',
        '  2. Revisa los elementos "Pendientes de Confirmacion"',
        '  3. Haz clic en "Confirmar" para cada entrega',
        '  4. Dibuja tu firma en el cuadro digital',
        '  5. Confirma la recepcion',
        '',
        '[!] ATENCION: Al confirmar, aceptas la responsabilidad sobre los elementos recibidos',
        '[i] Puedes ver el historial de todas tus entregas confirmadas'
      ]);

      addSection('9. Calificaciones de Clientes', [
        'Tu feedback de servicio:',
        '* Revisa calificaciones recibidas de clientes',
        '* Ve comentarios y sugerencias de mejora',
        '* Consulta tu promedio de calificacion',
        '* Identifica areas de oportunidad',
        '',
        '[i] Las calificaciones positivas pueden sumarte puntos y reconocimientos',
        '[i] Usa el feedback constructivo para mejorar tu servicio'
      ]);

      addSection('10. Medallas y Reconocimientos', [
        'Tu progreso y logros:',
        '* Ve todas las medallas que has ganado',
        '* Revisa tus puntos acumulados',
        '* Consulta premios disponibles para canjear',
        '* Accede al ranking de empleados',
        '',
        '[i] TIP: Completa tareas y capacitaciones para ganar mas puntos'
      ]);

      addSection('11. Seguridad y Privacidad', [
        'Protege tu cuenta y datos:',
        '* Tu contraseña es personal e intransferible - nunca la compartas',
        '* Cada empleado solo ve su propia informacion',
        '* No puedes acceder a datos de otros empleados',
        '* El sistema registra todos los accesos por seguridad',
        '',
        'Buenas practicas de seguridad:',
        '  - Cambia tu contraseña periodicamente',
        '  - No uses la misma contraseña de otras cuentas',
        '  - Cierra sesion al terminar, especialmente en PCs compartidas',
        '  - No dejes tu sesion abierta sin supervision',
        '  - Reporta inmediatamente actividad sospechosa',
        '',
        'Proteccion de datos:',
        '  - Tus datos personales estan protegidos',
        '  - Solo personal autorizado puede ver informacion sensible',
        '  - Cumplimos con politicas de privacidad de datos',
        '',
        '[!] ALERTA: Si sospechas que tu cuenta fue comprometida, contacta INMEDIATAMENTE a RRHH',
        '[i] La seguridad de tu cuenta es tu responsabilidad'
      ]);

      addSection('12. Cerrar Sesion', [
        'Salir del sistema de forma segura:',
        '* Busca el boton de "Cerrar Sesion" en el menu lateral',
        '* Normalmente esta al final del sidebar',
        '* Siempre cierra sesion cuando termines, especialmente en computadoras compartidas',
        '',
        '[!] SEGURIDAD: Por tu seguridad, cierra sesion si dejas la computadora desatendida.'
      ]);

      addSection('13. Preguntas Frecuentes (FAQ)', [
        'P: Olvide mi contrasena, que hago?',
        'R: Contacta a tu supervisor o al area de RRHH para solicitar un restablecimiento. El administrador podra generar una contrasena temporal y activar el cambio obligatorio.',
        '',
        'P: Como cambio mi contrasena despues del primer acceso?',
        'R: Ve a tu perfil o seccion de configuracion. Busca la opcion "Cambiar contraseña" e ingresa tu contraseña actual y la nueva. Recuerda cumplir con los requisitos de seguridad.',
        '',
        'P: Puedo acceder al sistema desde mi celular?',
        'R: Si, el sistema es responsive y funciona en dispositivos moviles. Usa el mismo usuario y contrasena.',
        '',
        'P: Puedo acceder desde mi casa o solo desde el trabajo?',
        'R: Depende de la configuracion de tu empresa. Algunas funciones pueden estar disponibles desde cualquier lugar, mientras que otras (como el fichaje) pueden requerir estar en las instalaciones.',
        '',
        'P: Que hago si olvide fichar mi entrada/salida?',
        'R: Contacta inmediatamente a tu supervisor o al area de RRHH. Ellos pueden realizar un registro manual con la justificacion correspondiente.',
        '',
        'P: Como se si tengo entregas pendientes de confirmar?',
        'R: En tu dashboard veras una notificacion. Tambien puedes revisar la seccion "Entregas de Elementos" donde apareceran como "Pendientes de Confirmacion".',
        '',
        'P: Cuanto tiempo tengo para firmar un documento obligatorio?',
        'R: El plazo varia segun el documento. Revisa la fecha limite en la seccion "Mis Documentos". Los documentos vencidos apareceran resaltados.',
        '',
        'P: Como se calculan mis puntos?',
        'R: Los puntos se asignan automaticamente al completar tareas, capacitaciones y recibir medallas. Cada actividad tiene un valor especifico.',
        '',
        'P: Puedo cancelar una solicitud de vacaciones?',
        'R: Si la solicitud esta pendiente de aprobacion, contacta a tu supervisor. Si ya fue aprobada, necesitaras autorizacion especial.',
        '',
        'P: Que hago si no veo una tarea que me asignaron?',
        'R: Verifica que estes viendo la seccion correcta. Si el problema persiste, contacta a quien te asigno la tarea o al area de RRHH.',
        '',
        'P: El sistema no me deja registrar mi entrada en el kiosco',
        'R: Verifica tu conexion a internet. Si el problema continua, usa el "Registro Manual" o contacta al supervisor de turno.',
        '',
        'P: Puedo descargar mis documentos firmados?',
        'R: Si, en la seccion "Mis Documentos" encontraras un boton de descarga para cada documento que hayas firmado.',
        '',
        'P: Otros empleados pueden ver mi informacion?',
        'R: No. Cada empleado solo puede ver su propia informacion. Solo los administradores y supervisores autorizados tienen acceso a datos de multiples empleados.',
      ]);

      addSection('14. Necesitas Ayuda?', [
        'Recursos de soporte:',
        '* Contacta a tu supervisor directo',
        '* Comunicate con el area de Recursos Humanos',
        '* Revisa esta guia cuando tengas dudas',
        '* Pregunta a companeros que ya usan el sistema',
        '',
        '[i] No dudes en pedir ayuda, estamos para apoyarte'
      ]);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, margin, 290);
      }

      doc.save('Instructivo-Empleados.pdf');
      
      toast({
        title: "PDF descargado",
        description: "El instructivo se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el instructivo en PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle>Guía Rápida para Empleados</CardTitle>
          <Badge variant="secondary">Nuevo</Badge>
          <Button 
            onClick={generarPDF}
            size="sm" 
            variant="outline" 
            className="ml-auto flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
        <CardDescription>
          Aprende cómo usar el sistema en pocos minutos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="login">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Cómo Iniciar Sesión</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Acceso a tu cuenta</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ingresa tu <strong>correo electrónico corporativo</strong></li>
                <li>Escribe tu <strong>contraseña</strong> personal</li>
                <li>Haz clic en "Iniciar Sesión"</li>
                <li>Si es tu primer acceso, el sistema te pedirá cambiar tu contraseña</li>
              </ul>
              <Badge variant="destructive" className="mt-2">Primer Acceso</Badge>
              <p className="mt-1">
                <strong>¿Primera vez?</strong> Deberás crear una contraseña nueva y segura con:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Mínimo 8 caracteres</li>
                <li>Al menos una letra mayúscula</li>
                <li>Al menos un número</li>
                <li>Al menos un carácter especial (!@#$%)</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                🔒 Guarda tu contraseña en un lugar seguro
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dashboard">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Tu Dashboard Personal</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p>
                El dashboard es tu página principal donde verás:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Resumen de tus tareas pendientes y completadas</li>
                <li>Capacitaciones activas y próximas</li>
                <li>Documentos que debes firmar o revisar</li>
                <li>Tus puntos y reconocimientos actuales</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                💡 Revisa tu dashboard diariamente para estar al día
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tareas">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span>Gestión de Tareas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>¿Qué puedes hacer?</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ver todas las tareas que te han asignado</li>
                <li>Marcar tareas como completadas</li>
                <li>Ver fechas límite y prioridades</li>
                <li>Acceder desde el menú lateral → "Mis Tareas"</li>
              </ul>
              <Badge variant="outline" className="mt-2">Acción rápida</Badge>
              <p className="mt-1">
                Haz clic en cualquier tarea para ver más detalles o marcarla como finalizada.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="capacitaciones">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>Capacitaciones</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Tu desarrollo profesional</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Accede a capacitaciones asignadas</li>
                <li>Revisa materiales de formación</li>
                <li>Marca capacitaciones como completadas</li>
                <li>Ve tu historial de formación</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                📚 Completar capacitaciones puede sumar puntos a tu perfil
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="documentos">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Documentos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Gestiona tu documentación</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Firma documentos obligatorios digitalmente</li>
                <li>Descarga copias de documentos firmados</li>
                <li>Ve el estado de cada documento (pendiente/firmado)</li>
                <li>Recibe notificaciones de nuevos documentos</li>
              </ul>
              <Badge variant="destructive" className="mt-2">Importante</Badge>
              <p className="mt-1">
                Algunos documentos son obligatorios y deben firmarse en un plazo determinado.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fichaje">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Sistema de Fichaje</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Registro de asistencia</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Registra tu entrada al inicio de tu turno</li>
                <li>Registra tu salida al finalizar tu jornada</li>
                <li>El sistema puede usar reconocimiento facial (si está habilitado)</li>
                <li>Puedes ver tu historial de fichajes</li>
              </ul>
              <Badge variant="outline" className="mt-2">Proceso de Entrada</Badge>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                <li>Ingresa al kiosco de fichaje o usa tu panel</li>
                <li>Verifica que sea tu turno programado</li>
                <li>Confirma tu identidad (facial o manual)</li>
                <li>El sistema registra automáticamente la hora</li>
              </ol>
              <Badge variant="outline" className="mt-2">Proceso de Salida</Badge>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                <li>Ve al kiosco o panel antes de finalizar</li>
                <li>Confirma las tareas completadas del día (si aplica)</li>
                <li>Registra tu estado de ánimo (opcional)</li>
                <li>Confirma tu salida</li>
              </ol>
              <Badge variant="destructive" className="mt-2">Importante</Badge>
              <p className="mt-1">
                Registra puntualmente para mantener control preciso de asistencia. Si olvidas fichar, contacta a tu supervisor.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="reconocimientos">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>Medallas y Reconocimientos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Tu progreso y logros</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ve todas las medallas que has ganado</li>
                <li>Revisa tus puntos acumulados</li>
                <li>Consulta premios disponibles para canjear</li>
                <li>Accede al ranking de empleados</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                🏆 Completa tareas y capacitaciones para ganar más puntos
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="calificaciones">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span>Calificaciones de Clientes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Feedback de tu trabajo</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Revisa calificaciones recibidas de clientes</li>
                <li>Ve comentarios y sugerencias</li>
                <li>Consulta tu promedio de calificación</li>
                <li>Identifica áreas de mejora</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                ⭐ Las calificaciones positivas pueden sumarte puntos y reconocimientos
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="entregas">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Confirmar Entregas de Elementos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Gestiona tus equipos y uniformes</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Revisa elementos pendientes de confirmar</li>
                <li>Lee cuidadosamente la descripción de cada elemento</li>
                <li>Verifica tallas, cantidades y estado</li>
                <li>Firma digitalmente para confirmar recepción</li>
                <li>Ve el historial de entregas confirmadas</li>
              </ul>
              <Badge variant="outline" className="mt-2">Proceso de Confirmación</Badge>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                <li>Ve a la sección "Entregas de Elementos"</li>
                <li>Revisa los elementos "Pendientes de Confirmación"</li>
                <li>Haz clic en "Confirmar" para cada entrega</li>
                <li>Dibuja tu firma en el cuadro digital</li>
                <li>Confirma la recepción</li>
              </ol>
              <Badge variant="destructive" className="mt-2">Atención</Badge>
              <p className="mt-1">
                Al confirmar, aceptas la responsabilidad sobre los elementos recibidos.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="eventos">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Eventos del Equipo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Mantente informado</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ve próximos eventos de la empresa</li>
                <li>Cumpleaños de compañeros</li>
                <li>Aniversarios laborales</li>
                <li>Reuniones y actividades programadas</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="vacaciones">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                <span>Solicitar Vacaciones</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Cómo solicitar tus vacaciones</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ve a <strong>"Vacaciones"</strong> en el menú lateral</li>
                <li>Haz clic en <strong>"Solicitar Vacaciones"</strong></li>
                <li>Selecciona las fechas de inicio y fin</li>
                <li>Verifica cuántos días disponibles tienes</li>
                <li>Agrega un comentario si es necesario</li>
                <li>Envía la solicitud y espera aprobación</li>
              </ul>
              <Badge variant="outline" className="mt-2">Importante</Badge>
              <p className="mt-1">
                <strong>Planifica con anticipación:</strong> Las solicitudes deben hacerse con al menos 15 días de anticipación.
              </p>
              <p className="mt-2">
                <strong>Seguimiento:</strong> Puedes ver el estado de tus solicitudes (pendiente, aprobada, rechazada) en la misma sección.
              </p>
              <p className="text-primary font-medium mt-2">
                🏖️ Revisa tu saldo de días disponibles antes de solicitar
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="navegacion">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                <span>Navegación en el Sistema</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Cómo moverte por el sistema</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Usa el <strong>menú lateral izquierdo</strong> para acceder a diferentes secciones</li>
                <li>Haz clic en el <strong>ícono de menú (☰)</strong> para expandir/contraer el sidebar</li>
                <li>Tu nombre y rol aparecen en la parte superior</li>
                <li>Algunas secciones tienen subsecciones que se expanden</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                📱 El sistema es responsive y funciona en móviles también
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="seguridad">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Seguridad y Privacidad</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Protege tu cuenta y datos</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Tu contraseña es personal e intransferible - <strong>nunca la compartas</strong></li>
                <li>Cada empleado solo ve su propia información</li>
                <li>No puedes acceder a datos de otros empleados</li>
                <li>El sistema registra todos los accesos por seguridad</li>
              </ul>
              <Badge variant="outline" className="mt-2">Buenas Prácticas</Badge>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                <li>Cambia tu contraseña periódicamente</li>
                <li>No uses la misma contraseña de otras cuentas</li>
                <li>Cierra sesión al terminar, especialmente en PCs compartidas</li>
                <li>No dejes tu sesión abierta sin supervisión</li>
                <li>Reporta inmediatamente actividad sospechosa</li>
              </ul>
              <Badge variant="outline" className="mt-2">Protección de Datos</Badge>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                <li>Tus datos personales están protegidos</li>
                <li>Solo personal autorizado puede ver información sensible</li>
                <li>Cumplimos con políticas de privacidad de datos</li>
              </ul>
              <Badge variant="destructive" className="mt-2">Alerta</Badge>
              <p className="mt-1">
                Si sospechas que tu cuenta fue comprometida, contacta <strong>INMEDIATAMENTE</strong> a RRHH.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cerrar-sesion">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Salir del sistema de forma segura</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Busca el botón de <strong>"Cerrar Sesión"</strong> en el menú lateral</li>
                <li>Normalmente está al final del sidebar</li>
                <li>Siempre cierra sesión cuando termines, especialmente en computadoras compartidas</li>
              </ul>
              <Badge variant="destructive" className="mt-2">Seguridad</Badge>
              <p className="mt-1">
                Por tu seguridad, cierra sesión si dejas la computadora desatendida.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="h-4 w-4" />
                <span>Preguntas Frecuentes (FAQ)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <p className="font-semibold text-foreground">¿Olvidé mi contraseña, qué hago?</p>
                <p>Contacta a tu supervisor o al área de RRHH para solicitar un restablecimiento. El administrador podrá generar una contraseña temporal y activar el cambio obligatorio.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Cómo cambio mi contraseña después del primer acceso?</p>
                <p>Ve a tu perfil o sección de configuración. Busca la opción "Cambiar contraseña" e ingresa tu contraseña actual y la nueva. Recuerda cumplir con los requisitos de seguridad (8 caracteres, mayúscula, número, símbolo).</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Puedo acceder al sistema desde mi celular?</p>
                <p>Sí, el sistema es responsive y funciona en dispositivos móviles. Usa el mismo usuario y contraseña.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Puedo acceder desde mi casa o solo desde el trabajo?</p>
                <p>Depende de la configuración de tu empresa. Algunas funciones pueden estar disponibles desde cualquier lugar, mientras que otras (como el fichaje) pueden requerir estar en las instalaciones.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Qué hago si olvidé fichar mi entrada/salida?</p>
                <p>Contacta inmediatamente a tu supervisor o al área de RRHH. Ellos pueden realizar un registro manual con la justificación correspondiente.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Cómo sé si tengo entregas pendientes de confirmar?</p>
                <p>En tu dashboard verás una notificación. También puedes revisar la sección "Entregas de Elementos" donde aparecerán como "Pendientes de Confirmación".</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Cuánto tiempo tengo para firmar un documento obligatorio?</p>
                <p>El plazo varía según el documento. Revisa la fecha límite en la sección "Mis Documentos". Los documentos vencidos aparecerán resaltados.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Cómo se calculan mis puntos?</p>
                <p>Los puntos se asignan automáticamente al completar tareas, capacitaciones y recibir medallas. Cada actividad tiene un valor específico.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Puedo cancelar una solicitud de vacaciones?</p>
                <p>Si la solicitud está pendiente de aprobación, contacta a tu supervisor. Si ya fue aprobada, necesitarás autorización especial.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Qué hago si no veo una tarea que me asignaron?</p>
                <p>Verifica que estés viendo la sección correcta. Si el problema persiste, contacta a quien te asignó la tarea o al área de RRHH.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">El sistema no me deja registrar mi entrada en el kiosco</p>
                <p>Verifica tu conexión a internet. Si el problema continúa, usa el "Registro Manual" o contacta al supervisor de turno.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Puedo descargar mis documentos firmados?</p>
                <p>Sí, en la sección "Mis Documentos" encontrarás un botón de descarga para cada documento que hayas firmado.</p>
              </div>
              
              <div>
                <p className="font-semibold text-foreground">¿Otros empleados pueden ver mi información?</p>
                <p>No. Cada empleado solo puede ver su propia información. Solo los administradores y supervisores autorizados tienen acceso a datos de múltiples empleados.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ayuda">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>¿Necesitas Ayuda?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Recursos de soporte</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Contacta a tu supervisor directo</li>
                <li>Comunícate con el área de Recursos Humanos</li>
                <li>Revisa esta guía cuando tengas dudas</li>
                <li>Pregunta a compañeros que ya usan el sistema</li>
              </ul>
              <p className="text-primary font-medium mt-2">
                💬 No dudes en pedir ayuda, estamos para apoyarte
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};