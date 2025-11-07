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
  Download
} from "lucide-react";
import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";

interface EmpleadoInstructivoProps {
  empleadoNombre?: string;
  empleadoApellido?: string;
  empleadoEmail?: string;
}

export const EmpleadoInstructivo = ({ empleadoNombre, empleadoApellido, empleadoEmail }: EmpleadoInstructivoProps) => {
  const { toast } = useToast();

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
      addSection('1. Cómo Iniciar Sesión', [
        '• Ingresa tu correo electrónico corporativo',
        '• Escribe tu contraseña personal',
        '• Haz clic en "Iniciar Sesión"',
        '• Si es tu primer acceso, el sistema te pedirá cambiar tu contraseña',
        '',
        'Requisitos de contraseña (primer acceso):',
        '  - Mínimo 8 caracteres',
        '  - Al menos una letra mayúscula',
        '  - Al menos un número',
        '  - Al menos un carácter especial (!@#$%)',
        '',
        '⚠️ Guarda tu contraseña en un lugar seguro'
      ]);

      addSection('2. Tu Dashboard Personal', [
        'El dashboard es tu página principal donde verás:',
        '• Resumen de tus tareas pendientes y completadas',
        '• Capacitaciones activas y próximas',
        '• Documentos que debes firmar o revisar',
        '• Tus puntos y reconocimientos actuales',
        '',
        '💡 Revisa tu dashboard diariamente para estar al día'
      ]);

      addSection('3. Gestión de Tareas', [
        '¿Qué puedes hacer?',
        '• Ver todas las tareas que te han asignado',
        '• Marcar tareas como completadas',
        '• Ver fechas límite y prioridades',
        '• Acceder desde el menú lateral → "Mis Tareas"',
        '',
        'Acción rápida: Haz clic en cualquier tarea para ver más detalles o marcarla como finalizada.'
      ]);

      addSection('4. Capacitaciones', [
        'Tu desarrollo profesional:',
        '• Accede a capacitaciones asignadas',
        '• Revisa materiales de formación',
        '• Marca capacitaciones como completadas',
        '• Ve tu historial de formación',
        '',
        '📚 Completar capacitaciones puede sumar puntos a tu perfil'
      ]);

      addSection('5. Documentos', [
        'Gestiona tu documentación:',
        '• Firma documentos obligatorios digitalmente',
        '• Descarga copias de documentos firmados',
        '• Ve el estado de cada documento (pendiente/firmado)',
        '• Recibe notificaciones de nuevos documentos',
        '',
        '⚠️ IMPORTANTE: Algunos documentos son obligatorios y deben firmarse en un plazo determinado.'
      ]);

      addSection('6. Solicitar Vacaciones', [
        'Cómo solicitar tus vacaciones:',
        '• Ve a "Vacaciones" en el menú lateral',
        '• Haz clic en "Solicitar Vacaciones"',
        '• Selecciona las fechas de inicio y fin',
        '• Verifica cuántos días disponibles tienes',
        '• Agrega un comentario si es necesario',
        '• Envía la solicitud y espera aprobación',
        '',
        '⚠️ Planifica con anticipación: Las solicitudes deben hacerse con al menos 15 días de anticipación.',
        '📋 Seguimiento: Puedes ver el estado de tus solicitudes (pendiente, aprobada, rechazada) en la misma sección.',
        '🏖️ Revisa tu saldo de días disponibles antes de solicitar'
      ]);

      addSection('7. Medallas y Reconocimientos', [
        'Tu progreso y logros:',
        '• Ve todas las medallas que has ganado',
        '• Revisa tus puntos acumulados',
        '• Consulta premios disponibles para canjear',
        '• Accede al ranking de empleados',
        '',
        '🏆 Completa tareas y capacitaciones para ganar más puntos'
      ]);

      addSection('8. Cerrar Sesión', [
        'Salir del sistema de forma segura:',
        '• Busca el botón de "Cerrar Sesión" en el menú lateral',
        '• Normalmente está al final del sidebar',
        '• Siempre cierra sesión cuando termines, especialmente en computadoras compartidas',
        '',
        '🔒 SEGURIDAD: Por tu seguridad, cierra sesión si dejas la computadora desatendida.'
      ]);

      addSection('9. ¿Necesitas Ayuda?', [
        'Recursos de soporte:',
        '• Contacta a tu supervisor directo',
        '• Comunícate con el área de Recursos Humanos',
        '• Revisa esta guía cuando tengas dudas',
        '• Pregunta a compañeros que ya usan el sistema',
        '',
        '💬 No dudes en pedir ayuda, estamos para apoyarte'
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="entregas">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Entregas de Elementos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Gestiona tus equipos y uniformes</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Confirma la recepción de elementos entregados</li>
                <li>Ve el historial de entregas anteriores</li>
                <li>Firma digitalmente los documentos de entrega</li>
                <li>Consulta qué elementos tienes asignados</li>
              </ul>
              <Badge variant="outline" className="mt-2">Recordatorio</Badge>
              <p className="mt-1">
                Debes confirmar las entregas para que queden registradas en el sistema.
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