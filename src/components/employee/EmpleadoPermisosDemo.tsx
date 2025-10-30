import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  GraduationCap,
  Award,
  Calendar,
  Package,
  Star,
  Target,
  Trophy,
  Briefcase,
  HelpCircle,
  Eye,
  Edit,
  Download,
  Upload,
  Users,
  BarChart3,
  Settings,
  BookOpen,
  FileDown
} from "lucide-react"
import { generateEmpleadoPermisosPDF } from "@/utils/pdfGenerator"
import { toast } from "sonner"

export const EmpleadoPermisosDemo = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  const handleGeneratePDF = () => {
    try {
      const fileName = generateEmpleadoPermisosPDF();
      toast.success("PDF generado correctamente", {
        description: `Archivo descargado: ${fileName}`,
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar el PDF", {
        description: "Por favor, intenta nuevamente",
      });
    }
  };

  const permisos = {
    visualizar: [
      {
        icon: Eye,
        titulo: "Mi Dashboard Personal",
        descripcion: "Ver resumen de tus tareas, capacitaciones y documentos",
        acceso: "Completo",
        demo: "Dashboard con estadísticas personales, calendario de eventos y acceso rápido a todas tus actividades"
      },
      {
        icon: CheckCircle,
        titulo: "Mis Tareas Asignadas",
        descripcion: "Ver todas las tareas que te han asignado con fechas límite",
        acceso: "Solo tus tareas",
        demo: "Lista de tareas con filtros por estado, prioridad y fecha de vencimiento"
      },
      {
        icon: FileText,
        titulo: "Mis Documentos",
        descripcion: "Acceder a documentos obligatorios y personales",
        acceso: "Solo tus documentos",
        demo: "Galería de documentos con estado de lectura/firma y opción de descarga"
      },
      {
        icon: GraduationCap,
        titulo: "Mis Capacitaciones",
        descripcion: "Ver capacitaciones asignadas y materiales de estudio",
        acceso: "Solo tus capacitaciones",
        demo: "Lista de cursos activos con progreso, materiales descargables y certificados"
      },
      {
        icon: Award,
        titulo: "Mis Medallas e Insignias",
        descripcion: "Ver logros y reconocimientos obtenidos",
        acceso: "Solo tus logros",
        demo: "Galería de insignias con descripción, fecha de obtención y puntos ganados"
      },
      {
        icon: Star,
        titulo: "Mis Calificaciones",
        descripcion: "Ver calificaciones de clientes y feedback recibido",
        acceso: "Solo tus calificaciones",
        demo: "Historial de calificaciones con promedio, comentarios y tendencias"
      },
      {
        icon: Package,
        titulo: "Mis Entregas de Elementos",
        descripcion: "Consultar elementos asignados (uniformes, equipos, etc.)",
        acceso: "Solo tus entregas",
        demo: "Lista de elementos recibidos con fechas, estados y documentos de entrega"
      },
      {
        icon: Trophy,
        titulo: "Premios Disponibles",
        descripcion: "Ver catálogo de premios que puedes canjear",
        acceso: "Catálogo completo",
        demo: "Galería de premios con puntos requeridos, disponibilidad y canje"
      },
      {
        icon: Target,
        titulo: "Desafíos Activos",
        descripcion: "Ver desafíos y competencias en curso",
        acceso: "Desafíos disponibles",
        demo: "Lista de desafíos con progreso, premios y ranking de participantes"
      },
      {
        icon: BarChart3,
        titulo: "Mi Ranking",
        descripcion: "Ver tu posición en rankings de la empresa",
        acceso: "Rankings públicos",
        demo: "Tabla de clasificación con tu posición, puntos y comparativa con otros"
      },
      {
        icon: Calendar,
        titulo: "Eventos del Equipo",
        descripcion: "Ver cumpleaños, aniversarios y eventos de compañeros",
        acceso: "Eventos generales",
        demo: "Calendario con próximos eventos, cumpleaños y fechas importantes"
      },
      {
        icon: Clock,
        titulo: "Mi Fichaje y Asistencia",
        descripcion: "Registrar entrada/salida y ver historial de asistencia",
        acceso: "Solo tu fichaje",
        demo: "Registro de horarios con estado diario, incidencias y solicitudes"
      }
    ],
    acciones: [
      {
        icon: Edit,
        titulo: "Marcar Tareas como Completadas",
        descripcion: "Actualizar el estado de tus tareas asignadas",
        restriccion: "Solo tareas asignadas a ti"
      },
      {
        icon: FileText,
        titulo: "Firmar Documentos Digitalmente",
        descripcion: "Confirmar lectura y firmar documentos obligatorios",
        restriccion: "Solo documentos asignados a ti"
      },
      {
        icon: CheckCircle,
        titulo: "Completar Capacitaciones",
        descripcion: "Marcar módulos de capacitación como completados",
        restriccion: "Solo tus capacitaciones activas"
      },
      {
        icon: Package,
        titulo: "Confirmar Recepción de Elementos",
        descripcion: "Confirmar que recibiste uniformes, equipos, etc.",
        restriccion: "Solo elementos entregados a ti"
      },
      {
        icon: Trophy,
        titulo: "Canjear Premios",
        descripcion: "Usar tus puntos para canjear premios del catálogo",
        restriccion: "Según puntos disponibles"
      },
      {
        icon: Target,
        titulo: "Participar en Desafíos",
        descripcion: "Inscribirte y participar en desafíos activos",
        restriccion: "Desafíos abiertos a empleados"
      },
      {
        icon: Clock,
        titulo: "Registrar Fichaje",
        descripcion: "Marcar entrada, salida y pausas",
        restriccion: "Solo tus propios fichajes"
      },
      {
        icon: Calendar,
        titulo: "Solicitar Vacaciones",
        descripcion: "Enviar solicitudes de días de vacaciones",
        restriccion: "Según saldo disponible"
      },
      {
        icon: FileText,
        titulo: "Crear Solicitudes",
        descripcion: "Enviar solicitudes de permisos, licencias, etc.",
        restriccion: "Tipos de solicitud habilitados"
      },
      {
        icon: Download,
        titulo: "Descargar Documentos",
        descripcion: "Descargar copias de documentos firmados",
        restriccion: "Solo tus documentos"
      }
    ],
    restricciones: [
      {
        icon: XCircle,
        titulo: "Datos de Otros Empleados",
        mensaje: "No puedes ver información personal de otros empleados (salarios, evaluaciones, etc.)"
      },
      {
        icon: XCircle,
        titulo: "Configuración del Sistema",
        mensaje: "No tienes acceso a configuraciones administrativas o de sistema"
      },
      {
        icon: XCircle,
        titulo: "Gestión de Usuarios",
        mensaje: "No puedes crear, modificar o eliminar usuarios del sistema"
      },
      {
        icon: XCircle,
        titulo: "Asignación de Tareas",
        mensaje: "No puedes asignar tareas a otros empleados"
      },
      {
        icon: XCircle,
        titulo: "Gestión de Sucursales",
        mensaje: "No tienes acceso a administración de sucursales o estructura organizacional"
      },
      {
        icon: XCircle,
        titulo: "Reportes Generales",
        mensaje: "No puedes generar reportes de toda la empresa (solo tus propios datos)"
      },
      {
        icon: XCircle,
        titulo: "Gestión de Presupuestos",
        mensaje: "No tienes acceso a información de presupuestos o finanzas"
      },
      {
        icon: XCircle,
        titulo: "Aprobación de Solicitudes",
        mensaje: "No puedes aprobar o rechazar solicitudes de otros empleados"
      }
    ]
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <CardTitle>Permisos y Accesos del Rol Empleado</CardTitle>
            <CardDescription>
              Funciones disponibles, restricciones y demos interactivas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleGeneratePDF} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Generar PDF
            </Button>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Rol: Empleado
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="visualizar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visualizar">
              <Eye className="h-4 w-4 mr-2" />
              Ver Información
            </TabsTrigger>
            <TabsTrigger value="acciones">
              <Edit className="h-4 w-4 mr-2" />
              Acciones Permitidas
            </TabsTrigger>
            <TabsTrigger value="restricciones">
              <XCircle className="h-4 w-4 mr-2" />
              Restricciones
            </TabsTrigger>
          </TabsList>

          {/* Tab: Información que puedes visualizar */}
          <TabsContent value="visualizar" className="space-y-4">
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertTitle>Información Disponible</AlertTitle>
              <AlertDescription>
                Como empleado, puedes visualizar toda tu información personal y participar en las actividades de la empresa.
                Toda la información está protegida y solo tú puedes acceder a tus datos.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {permisos.visualizar.map((permiso, index) => {
                const Icon = permiso.icon
                return (
                  <Card key={index} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{permiso.titulo}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {permiso.descripcion}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Acceso:</span>
                        <Badge variant="secondary">{permiso.acceso}</Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setActiveDemo(activeDemo === permiso.titulo ? null : permiso.titulo)}
                      >
                        <BookOpen className="h-3 w-3 mr-2" />
                        {activeDemo === permiso.titulo ? "Ocultar" : "Ver"} Demo
                      </Button>
                      {activeDemo === permiso.titulo && (
                        <Alert className="mt-2">
                          <HelpCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {permiso.demo}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Tab: Acciones que puedes realizar */}
          <TabsContent value="acciones" className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Acciones Permitidas</AlertTitle>
              <AlertDescription>
                Puedes realizar estas acciones en el sistema. Todas las acciones están limitadas a tu información personal
                y están auditadas por seguridad.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              {permisos.acciones.map((accion, index) => {
                const Icon = accion.icon
                return (
                  <Card key={index} className="hover:border-green-500/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Icon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm">{accion.titulo}</h4>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Permitido
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {accion.descripcion}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Restricción: {accion.restriccion}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Tab: Restricciones */}
          <TabsContent value="restricciones" className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Restricciones de Seguridad</AlertTitle>
              <AlertDescription>
                Por seguridad y privacidad, no tienes acceso a las siguientes funciones administrativas.
                Si necesitas alguna de estas funciones, contacta a tu supervisor o al área de RRHH.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              {permisos.restricciones.map((restriccion, index) => {
                const Icon = restriccion.icon
                return (
                  <Card key={index} className="border-red-200 bg-red-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Icon className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-red-900 mb-1">
                            {restriccion.titulo}
                          </h4>
                          <p className="text-sm text-red-700">
                            {restriccion.mensaje}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>¿Necesitas más permisos?</AlertTitle>
              <AlertDescription>
                Si tu trabajo requiere acceso a funciones administrativas adicionales, solicita a tu supervisor
                que evalúe un cambio de rol o permisos especiales. Contacta al área de RRHH para más información.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Resumen de Seguridad */}
        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-2">Seguridad y Privacidad</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>✓ Todos tus datos están protegidos con Row-Level Security (RLS)</p>
                  <p>✓ Solo tú puedes ver y modificar tu información personal</p>
                  <p>✓ Todas las acciones quedan registradas en auditoría</p>
                  <p>✓ Tu información nunca es visible para otros empleados del mismo nivel</p>
                  <p>✓ Los administradores solo acceden a tu información cuando es necesario</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
