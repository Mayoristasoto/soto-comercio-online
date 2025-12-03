import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  User, 
  Users, 
  Shield, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  Trophy, 
  Calendar, 
  Award,
  Star,
  Package,
  Clock,
  Building2,
  Target,
  BarChart3,
  Settings,
  Eye,
  Lock,
  Unlock
} from "lucide-react"

interface SidebarItem {
  label: string
  icon: React.ReactNode
  access: boolean
}

interface DashboardSection {
  title: string
  description: string
  icon: React.ReactNode
  access: boolean
}

export function RolePreview() {
  const [selectedRole, setSelectedRole] = useState<'empleado' | 'gerente_sucursal'>('empleado')

  const empleadoSidebar: SidebarItem[] = [
    { label: "Dashboard Personal", icon: <User className="h-4 w-4" />, access: true },
    { label: "Mis Tareas", icon: <CheckCircle2 className="h-4 w-4" />, access: true },
    { label: "Capacitaciones", icon: <BookOpen className="h-4 w-4" />, access: true },
    { label: "Documentos", icon: <FileText className="h-4 w-4" />, access: true },
    { label: "Vacaciones", icon: <Calendar className="h-4 w-4" />, access: true },
    { label: "Mis Insignias", icon: <Award className="h-4 w-4" />, access: true },
    { label: "Fichero (Solo Historial)", icon: <Clock className="h-4 w-4" />, access: true },
    { label: "Solicitudes", icon: <FileText className="h-4 w-4" />, access: true },
    { label: "Autogestión", icon: <User className="h-4 w-4" />, access: true },
    { label: "Administración", icon: <Shield className="h-4 w-4" />, access: false },
    { label: "Gestión de Personal", icon: <Users className="h-4 w-4" />, access: false },
    { label: "Configuración Sistema", icon: <Settings className="h-4 w-4" />, access: false },
  ]

  const gerenteSidebar: SidebarItem[] = [
    { label: "Dashboard Personal", icon: <User className="h-4 w-4" />, access: true },
    { label: "Mis Tareas", icon: <CheckCircle2 className="h-4 w-4" />, access: true },
    { label: "Capacitaciones", icon: <BookOpen className="h-4 w-4" />, access: true },
    { label: "Documentos", icon: <FileText className="h-4 w-4" />, access: true },
    { label: "Vacaciones", icon: <Calendar className="h-4 w-4" />, access: true },
    { label: "Mis Insignias", icon: <Award className="h-4 w-4" />, access: true },
    { label: "Fichero (Completo)", icon: <Clock className="h-4 w-4" />, access: true },
    { label: "Cambios de Horario", icon: <Clock className="h-4 w-4" />, access: true },
    { label: "Solicitudes (Aprobar)", icon: <FileText className="h-4 w-4" />, access: true },
    { label: "Vacaciones (Aprobar)", icon: <Calendar className="h-4 w-4" />, access: true },
    { label: "Empleados Sucursal", icon: <Users className="h-4 w-4" />, access: true },
    { label: "Evaluaciones", icon: <BarChart3 className="h-4 w-4" />, access: true },
    { label: "Administración", icon: <Shield className="h-4 w-4" />, access: false },
    { label: "Configuración Sistema", icon: <Settings className="h-4 w-4" />, access: false },
  ]

  const empleadoDashboard: DashboardSection[] = [
    { title: "Mis Tareas Asignadas", description: "Ve y actualiza el estado de tareas pendientes", icon: <CheckCircle2 className="h-5 w-5 text-blue-600" />, access: true },
    { title: "Mis Capacitaciones", description: "Accede a materiales de estudio asignados", icon: <BookOpen className="h-5 w-5 text-green-600" />, access: true },
    { title: "Mis Documentos", description: "Revisa y confirma lectura de documentos", icon: <FileText className="h-5 w-5 text-purple-600" />, access: true },
    { title: "Mis Logros", description: "Galería de medallas y reconocimientos", icon: <Award className="h-5 w-5 text-yellow-600" />, access: true },
    { title: "Calificaciones de Clientes", description: "Visualiza calificaciones recibidas", icon: <Star className="h-5 w-5 text-yellow-500" />, access: true },
    { title: "Entregas de Elementos", description: "Confirma recepción de elementos", icon: <Package className="h-5 w-5 text-orange-600" />, access: true },
    { title: "Próximos Eventos", description: "Cumpleaños y aniversarios del equipo", icon: <Calendar className="h-5 w-5 text-cyan-600" />, access: true },
  ]

  const gerenteDashboard: DashboardSection[] = [
    ...empleadoDashboard,
    { title: "Empleados de Mi Sucursal", description: "Gestión del personal a cargo", icon: <Users className="h-5 w-5 text-indigo-600" />, access: true },
    { title: "Fichajes del Equipo", description: "Control de asistencia de empleados", icon: <Clock className="h-5 w-5 text-teal-600" />, access: true },
    { title: "Cambios de Horario", description: "Solicitar cambios para empleados", icon: <Clock className="h-5 w-5 text-amber-600" />, access: true },
    { title: "Aprobar Vacaciones", description: "Gestionar solicitudes de vacaciones", icon: <Calendar className="h-5 w-5 text-green-600" />, access: true },
    { title: "Evaluaciones", description: "Realizar evaluaciones de desempeño", icon: <BarChart3 className="h-5 w-5 text-blue-600" />, access: true },
  ]

  const currentSidebar = selectedRole === 'empleado' ? empleadoSidebar : gerenteSidebar
  const currentDashboard = selectedRole === 'empleado' ? empleadoDashboard : gerenteDashboard

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Vista Previa de Roles</h2>
          <p className="text-sm text-muted-foreground">
            Visualiza qué información y accesos tiene cada rol en el sistema
          </p>
        </div>
      </div>

      <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'empleado' | 'gerente_sucursal')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="empleado" className="gap-2">
            <User className="h-4 w-4" />
            Empleado
          </TabsTrigger>
          <TabsTrigger value="gerente_sucursal" className="gap-2">
            <Building2 className="h-4 w-4" />
            Gerente de Sucursal
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedRole} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar Preview */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Menú Sidebar
                </CardTitle>
                <CardDescription>
                  Opciones visibles en el menú lateral
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {currentSidebar.map((item, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-md ${
                          item.access 
                            ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </div>
                        {item.access ? (
                          <Unlock className="h-4 w-4 text-green-600" />
                        ) : (
                          <Lock className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Dashboard Preview */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Dashboard - Secciones Visibles
                </CardTitle>
                <CardDescription>
                  Información mostrada en el dashboard del {selectedRole === 'empleado' ? 'empleado' : 'gerente'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentDashboard.map((section, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="p-2 rounded-md bg-muted">
                          {section.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{section.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {section.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">
                          Visible
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Resumen de Permisos - {selectedRole === 'empleado' ? 'Empleado' : 'Gerente de Sucursal'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <p className="text-2xl font-bold text-green-600">
                    {currentSidebar.filter(i => i.access).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Menús Accesibles</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <p className="text-2xl font-bold text-red-600">
                    {currentSidebar.filter(i => !i.access).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Menús Restringidos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-2xl font-bold text-blue-600">
                    {currentDashboard.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Secciones Dashboard</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedRole === 'empleado' ? 'Personal' : 'Equipo'}
                  </p>
                  <p className="text-sm text-muted-foreground">Alcance de Datos</p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                <h4 className="font-medium mb-2">
                  {selectedRole === 'empleado' ? '👤 Rol: Empleado' : '👔 Rol: Gerente de Sucursal'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {selectedRole === 'empleado' 
                    ? 'El empleado solo puede ver y gestionar su propia información personal: tareas asignadas, capacitaciones, documentos, vacaciones y reconocimientos. No tiene acceso a datos de otros empleados ni a funciones administrativas.'
                    : 'El gerente puede ver toda su información personal además de gestionar a los empleados de su sucursal: aprobar vacaciones, solicitudes, ver fichajes del equipo, realizar evaluaciones y solicitar cambios de horario. No tiene acceso a configuraciones del sistema ni a empleados de otras sucursales.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
