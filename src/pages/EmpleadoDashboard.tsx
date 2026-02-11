import { useState, useEffect } from "react"
import { useOutletContext, useLocation } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User,
  CheckCircle2,
  BookOpen,
  FileText,
  Trophy,
  Calendar,
  Target,
  Award,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { EmployeeDocuments } from "@/components/employee/EmployeeDocuments"
import { EmployeeTrainings } from "@/components/employee/EmployeeTrainings"
import { EmployeeBadges } from "@/components/employee/EmployeeBadges"
import { EmployeePrizes } from "@/components/employee/EmployeePrizes"
import { EmployeeTasks } from "@/components/employee/EmployeeTasks"
import { EventCards } from "@/components/employee/EventCards"
import { ConfirmarEntregas } from "@/components/employee/ConfirmarEntregas"
import { HistorialEntregas } from "@/components/employee/HistorialEntregas"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Star } from "lucide-react"
import CalificacionesEmpleado from "@/components/employee/CalificacionesEmpleado"
import { EmpleadoInstructivo } from "@/components/employee/EmpleadoInstructivo"
import { EmpleadoPermisosDemo } from "@/components/employee/EmpleadoPermisosDemo"
import { ForcedPasswordChange } from "@/components/employee/ForcedPasswordChange"
import { ForcedDocumentSigning } from "@/components/employee/ForcedDocumentSigning"
import { OnboardingDashboard } from "@/components/employee/OnboardingDashboard"
import { OnboardingDashboardEnhanced } from "@/components/employee/OnboardingDashboardEnhanced"
import { useOnboarding } from "@/hooks/useOnboarding"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
  grupo_id?: string
  avatar_url?: string
}

export default function EmpleadoDashboard() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [activeEntregasTab, setActiveEntregasTab] = useState("pendientes")
  const [debeCambiarPassword, setDebeCambiarPassword] = useState(false)
  const [debeFirmarDocumentos, setDebeFirmarDocumentos] = useState(false)
  const [stats, setStats] = useState({
    tareas: 0,
    capacitaciones: 0,
    documentos: 0,
    puntos: 0
  })

  // Hook de onboarding
  const { isInOnboarding, loading: onboardingLoading } = useOnboarding(userInfo?.id)

  useEffect(() => {
    if (userInfo) {
      checkPasswordChange()
      loadDashboardData()
    }
  }, [userInfo])

  const checkPasswordChange = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('debe_cambiar_password, debe_firmar_documentos_iniciales')
        .eq('id', userInfo.id)
        .single()

      if (error) throw error
      setDebeCambiarPassword(data?.debe_cambiar_password || false)
      setDebeFirmarDocumentos((data as any)?.debe_firmar_documentos_iniciales || false)
    } catch (error) {
      console.error('Error checking password change requirement:', error)
    }
  }

  // Detectar hash en la URL para scroll y cambio de tab
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash === 'entregas') {
      // Hacer scroll al elemento de entregas
      setTimeout(() => {
        const element = document.getElementById('entregas-section')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [location.hash])

  const loadDashboardData = async () => {
    try {
      // Cargar estadísticas básicas
      const [tareasRes, capacitacionesRes, documentosRes, insigniasRes] = await Promise.all([
        supabase.from('tareas').select('id').eq('asignado_a', userInfo.id),
        supabase.from('asignaciones_capacitacion').select('id').eq('empleado_id', userInfo.id),
        supabase.from('asignaciones_documentos_obligatorios').select('id').eq('empleado_id', userInfo.id),
        supabase
          .from('insignias_empleado')
          .select(`
            id,
            insignias!inner(puntos_valor)
          `)
          .eq('empleado_id', userInfo.id)
      ])

      // Calcular puntos totales de las medallas obtenidas
      const totalPuntos = insigniasRes.data?.reduce((sum, insignia) => {
        return sum + (insignia.insignias?.puntos_valor || 0)
      }, 0) || 0

      setStats({
        tareas: tareasRes.data?.length || 0,
        capacitaciones: capacitacionesRes.data?.length || 0,
        documentos: documentosRes.data?.length || 0,
        puntos: totalPuntos
      })
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar algunos datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || onboardingLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Si está en período de onboarding (primeros 30 días), mostrar dashboard especial
  if (isInOnboarding) {
    return (
      <div className="p-6 space-y-6" data-tour="dashboard">
        {debeCambiarPassword && (
          <ForcedPasswordChange 
            empleadoId={userInfo.id}
            empleadoEmail={userInfo.email}
            onPasswordChanged={() => setDebeCambiarPassword(false)}
          />
        )}
        {!debeCambiarPassword && debeFirmarDocumentos && (
          <ForcedDocumentSigning
            empleadoId={userInfo.id}
            onAllDocumentsSigned={() => setDebeFirmarDocumentos(false)}
          />
        )}
        
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            Bienvenido, {userInfo.nombre}
          </h1>
          <p className="text-muted-foreground mt-2">
            Completa tu proceso de incorporación para acceder a todas las funcionalidades
          </p>
        </div>

        <OnboardingDashboardEnhanced />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" data-tour="dashboard">
      {debeCambiarPassword && (
        <ForcedPasswordChange 
          empleadoId={userInfo.id}
          empleadoEmail={userInfo.email}
          onPasswordChanged={() => setDebeCambiarPassword(false)}
        />
      )}
      {!debeCambiarPassword && debeFirmarDocumentos && (
        <ForcedDocumentSigning
          empleadoId={userInfo.id}
          onAllDocumentsSigned={() => setDebeFirmarDocumentos(false)}
        />
      )}
      {/* Header personalizado */}
      <div data-tour="sidebar">
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <User className="h-8 w-8 text-primary" />
          <span>Mi Dashboard Personal</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido <strong>{userInfo.nombre} {userInfo.apellido}</strong>, aquí tienes un resumen personalizado de tu actividad
        </p>
        <div className="flex items-center space-x-2 mt-2">
          <Badge variant="secondary">
            {userInfo.rol === 'admin_rrhh' ? 'Administrador RRHH' : 
             userInfo.rol === 'gerente_sucursal' ? 'Gerente de Sucursal' : 
             userInfo.rol === 'lider_grupo' ? 'Líder de Grupo' : 'Empleado'}
          </Badge>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">{userInfo.email}</span>
        </div>
      </div>

      {/* Guía Rápida para Empleados */}
      <EmpleadoInstructivo 
        empleadoNombre={userInfo.nombre}
        empleadoApellido={userInfo.apellido}
        empleadoEmail={userInfo.email}
      />

      {/* Permisos y Accesos Detallados */}
      <EmpleadoPermisosDemo />

      {/* Tarjetas de estadísticas personales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mis Tareas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.tareas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Capacitaciones</p>
                <p className="text-2xl font-bold text-green-600">{stats.capacitaciones}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.documentos}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mis Puntos</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.puntos}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Próximos Eventos */}
      <Card className="animate-fade-in mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Próximos Eventos del Equipo</span>
          </CardTitle>
          <CardDescription>
            Cumpleaños, aniversarios y vencimientos de capacitaciones de todos los empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventCards employeeId={userInfo.id} />
        </CardContent>
      </Card>

      {/* Secciones principales del dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sección: Mis Tareas */}
        <Card className="animate-fade-in" data-tour="tareas">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span>Mis Tareas Asignadas</span>
            </CardTitle>
            <CardDescription>
              Gestiona y actualiza el estado de tus tareas pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTasks 
              empleadoId={userInfo.id} 
              onTasksUpdate={loadDashboardData}
            />
          </CardContent>
        </Card>

        {/* Sección: Mis Capacitaciones */}
        <Card className="animate-fade-in" data-tour="capacitaciones">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <span>Mis Capacitaciones</span>
            </CardTitle>
            <CardDescription>
              Accede a tus capacitaciones y materiales de estudio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTrainings empleadoId={userInfo.id} />
          </CardContent>
        </Card>

        {/* Sección: Documentos Asignados */}
        <Card className="animate-fade-in" data-tour="documentos">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span>Mis Documentos</span>
            </CardTitle>
            <CardDescription>
              Revisa y confirma lectura de documentos asignados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeDocuments empleadoId={userInfo.id} />
          </CardContent>
        </Card>

        {/* Sección: Mis Logros y Medallas */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <span>Mis Logros y Reconocimientos</span>
            </CardTitle>
            <CardDescription>
              Galería personal de medallas y reconocimientos obtenidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeBadges empleadoId={userInfo.id} />
          </CardContent>
        </Card>

        {/* Sección: Mis Calificaciones */}
        <Card className="animate-fade-in lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Mis Calificaciones de Clientes</span>
            </CardTitle>
            <CardDescription>
              Visualiza las calificaciones que los clientes te han dado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalificacionesEmpleado empleadoId={userInfo.id} />
          </CardContent>
        </Card>

        {/* Sección: Vacaciones */}
        <Card className="animate-fade-in" data-tour="vacaciones">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-cyan-600" />
              <span>Mis Vacaciones</span>
            </CardTitle>
            <CardDescription>
              Acceso rápido al sistema de vacaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <Button 
              onClick={() => window.location.href = '/vacaciones'}
              variant="outline"
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Ir a Vacaciones
            </Button>
          </CardContent>
        </Card>

        {/* Sección: Entregas de Elementos */}
        <Card id="entregas-section" className="animate-fade-in lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span>Mis Entregas de Elementos</span>
            </CardTitle>
            <CardDescription>
              Confirma la recepción de elementos entregados y consulta tu historial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeEntregasTab} onValueChange={setActiveEntregasTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pendientes">Pendientes de Confirmar</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>
              <TabsContent value="pendientes">
                <ConfirmarEntregas />
              </TabsContent>
              <TabsContent value="historial">
                <HistorialEntregas />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Mensaje de desarrollo */}
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Target className="h-5 w-5" />
            <span className="font-medium">Dashboard de Empleado - Arquitectura Implementada</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Base de datos segura configurada con políticas RLS ✓ | 
            Restricciones de acceso por empleado ✓ | 
            Estructura modular escalable ✓
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            🔒 <strong>Seguridad:</strong> Cada empleado solo puede acceder a su propia información personal
          </p>
        </CardContent>
        </Card>

    </div>
  )
}