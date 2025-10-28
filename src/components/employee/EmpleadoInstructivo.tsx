import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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
  LayoutDashboard
} from "lucide-react";

export const EmpleadoInstructivo = () => {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle>Guía Rápida para Empleados</CardTitle>
          <Badge variant="secondary" className="ml-auto">Nuevo</Badge>
        </div>
        <CardDescription>
          Aprende cómo usar el sistema en pocos minutos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
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