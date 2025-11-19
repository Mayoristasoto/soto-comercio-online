import { useState, useEffect } from "react"
import { useOutletContext, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Trophy,
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  Target,
  Briefcase,
  CheckCircle,
  XCircle,
  ArrowRight
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import EventCalendar from "@/components/dashboard/EventCalendar"
import { PWAInstallPrompt, PWAUpdatePrompt } from "@/components/PWAInstall"

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

interface DashboardStats {
  // RRHH
  evaluacionesPendientes: number
  solicitudesPendientes: number
  vacacionesPendientes: number
  documentosPendientes: number
  
  // Operaciones
  empleadosActivos: number
  asistenciaHoy: number
  tareasPendientes: number
  tareasVencidas: number
  
  // Reconocimiento
  puntosTotal: number
  desafiosActivos: number
  premiosDisponibles: number
  empleadosConLogros: number
}

export default function Dashboard() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    evaluacionesPendientes: 0,
    solicitudesPendientes: 0,
    vacacionesPendientes: 0,
    documentosPendientes: 0,
    empleadosActivos: 0,
    asistenciaHoy: 0,
    tareasPendientes: 0,
    tareasVencidas: 0,
    puntosTotal: 0,
    desafiosActivos: 0,
    premiosDisponibles: 0,
    empleadosConLogros: 0
  })

  const isAdmin = userInfo?.rol === 'admin_rrhh'
  const isGerente = userInfo?.rol === 'gerente_sucursal'
  const isLider = userInfo?.rol === 'lider_grupo'

  useEffect(() => {
    if (userInfo) {
      loadDashboardStats()
    }
  }, [userInfo])

  const loadDashboardStats = async () => {
    try {
      const newStats: DashboardStats = {
        evaluacionesPendientes: 0,
        solicitudesPendientes: 0,
        vacacionesPendientes: 0,
        documentosPendientes: 0,
        empleadosActivos: 0,
        asistenciaHoy: 0,
        tareasPendientes: 0,
        tareasVencidas: 0,
        puntosTotal: 0,
        desafiosActivos: 0,
        premiosDisponibles: 0,
        empleadosConLogros: 0
      }

      // RRHH Stats
      if (isAdmin || isGerente) {
        // @ts-ignore TS2589
        const evalResult = await supabase
          .from('empleados')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true)
        newStats.evaluacionesPendientes = evalResult.count || 0

        // @ts-ignore TS2589
        const solResult = await supabase
          .from('solicitudes')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
        newStats.solicitudesPendientes = solResult.count || 0

        // @ts-ignore TS2589
        const vacResult = await supabase
          .from('solicitudes_vacaciones')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
        newStats.vacacionesPendientes = vacResult.count || 0

        // @ts-ignore TS2589
        const docResult = await supabase
          .from('documentos_obligatorios')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true)
        newStats.documentosPendientes = docResult.count || 0

        // @ts-ignore TS2589
        const empResult = await supabase
          .from('empleados')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true)
        newStats.empleadosActivos = empResult.count || 0

        const today = new Date().toISOString().split('T')[0]
        // @ts-ignore TS2589
        const asisResult = await supabase
          .from('fichajes')
          .select('id', { count: 'exact', head: true })
          .gte('fecha_hora', `${today}T00:00:00`)
          .lte('fecha_hora', `${today}T23:59:59`)
        newStats.asistenciaHoy = asisResult.count || 0

        // @ts-ignore TS2589
        const tarResult = await supabase
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .neq('estado', 'completada')
        newStats.tareasPendientes = tarResult.count || 0

        // @ts-ignore TS2589
        const tarVencResult = await supabase
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .neq('estado', 'completada')
          .lt('fecha_limite', new Date().toISOString())
        newStats.tareasVencidas = tarVencResult.count || 0
      }

      // Reconocimiento Stats
      // @ts-ignore TS2589
      const puntosResult = await supabase
        .from('puntos')
        .select('puntos')
      let totalPuntos = 0
      if (puntosResult.data) {
        for (const item of puntosResult.data) {
          totalPuntos += item.puntos || 0
        }
      }
      newStats.puntosTotal = totalPuntos

      // @ts-ignore TS2589
      const desafResult = await supabase
        .from('desafios')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)
      newStats.desafiosActivos = desafResult.count || 0

      // @ts-ignore TS2589
      const premResult = await supabase
        .from('premios')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)
        .gt('stock', 0)
      newStats.premiosDisponibles = premResult.count || 0

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      // @ts-ignore TS2589
      const logrosResult = await supabase
        .from('insignias_empleado')
        .select('empleado_id', { count: 'exact', head: true })
        .gte('fecha_obtencion', thirtyDaysAgo.toISOString())
      newStats.empleadosConLogros = logrosResult.count || 0

      setStats(newStats)

    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar algunas estadísticas del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* PWA Install & Update */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <span>Dashboard Principal</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Resumen consolidado de todos los módulos del sistema
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="secondary">
              {isAdmin ? 'Administrador RRHH' : 
               isGerente ? 'Gerente de Sucursal' : 
               isLider ? 'Líder de Grupo' : 'Empleado'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Última actualización: {new Date().toLocaleTimeString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Calendario de Eventos - Primero */}
      {(isAdmin || isGerente) && (
        <EventCalendar showAllEvents={true} />
      )}

      {/* Módulo RRHH - Solo para Admin y Gerentes */}
      {(isAdmin || isGerente) && (
        <>
          <div className="flex items-center space-x-2 mt-8">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-semibold">Recursos Humanos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/rrhh/evaluaciones')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <ClipboardCheck className="h-8 w-8 text-blue-600" />
                  {stats.evaluacionesPendientes > 0 && (
                    <Badge variant="destructive">{stats.evaluacionesPendientes}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Evaluaciones</p>
                <p className="text-2xl font-bold">{stats.evaluacionesPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">pendientes</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/rrhh/solicitudes')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-8 w-8 text-purple-600" />
                  {stats.solicitudesPendientes > 0 && (
                    <Badge variant="destructive">{stats.solicitudesPendientes}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Solicitudes</p>
                <p className="text-2xl font-bold">{stats.solicitudesPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">pendientes de aprobar</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/rrhh/vacaciones')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="h-8 w-8 text-green-600" />
                  {stats.vacacionesPendientes > 0 && (
                    <Badge variant="destructive">{stats.vacacionesPendientes}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Vacaciones</p>
                <p className="text-2xl font-bold">{stats.vacacionesPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">solicitudes pendientes</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/rrhh/nomina')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold">{stats.documentosPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">activos</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Módulo Operaciones - Solo para Admin y Gerentes */}
      {(isAdmin || isGerente) && (
        <>
          <div className="flex items-center space-x-2 mt-8">
            <Briefcase className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-semibold">Operaciones</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">Empleados Activos</p>
                <p className="text-2xl font-bold">{stats.empleadosActivos}</p>
                <p className="text-xs text-muted-foreground mt-1">en plantilla</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/operaciones/fichero')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-sm text-muted-foreground">Asistencia Hoy</p>
                <p className="text-2xl font-bold">{stats.asistenciaHoy}</p>
                <p className="text-xs text-muted-foreground mt-1">fichajes registrados</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/operaciones/tareas')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-8 w-8 text-blue-600" />
                  {stats.tareasPendientes > 0 && (
                    <Badge variant="secondary">{stats.tareasPendientes}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Tareas Activas</p>
                <p className="text-2xl font-bold">{stats.tareasPendientes}</p>
                <p className="text-xs text-muted-foreground mt-1">en progreso</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/operaciones/tareas')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  {stats.tareasVencidas > 0 && (
                    <Badge variant="destructive">{stats.tareasVencidas}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Tareas Vencidas</p>
                <p className="text-2xl font-bold text-red-600">{stats.tareasVencidas}</p>
                <p className="text-xs text-muted-foreground mt-1">requieren atención</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Módulo Reconocimiento - Visible para todos */}
      <div className="flex items-center space-x-2 mt-8">
        <Trophy className="h-6 w-6 text-yellow-600" />
        <h2 className="text-2xl font-semibold">Reconocimiento y Logros</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/reconoce/ranking')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-sm text-muted-foreground">Puntos Totales</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.puntosTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">en el sistema</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/reconoce/desafios')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-8 w-8 text-blue-600" />
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Desafíos Activos</p>
            <p className="text-2xl font-bold">{stats.desafiosActivos}</p>
            <p className="text-xs text-muted-foreground mt-1">disponibles</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/reconoce/premios')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-sm text-muted-foreground">Premios</p>
            <p className="text-2xl font-bold">{stats.premiosDisponibles}</p>
            <p className="text-xs text-muted-foreground mt-1">disponibles</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/reconoce/insignias')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="h-8 w-8 text-amber-600" />
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Logros Recientes</p>
            <p className="text-2xl font-bold">{stats.empleadosConLogros}</p>
            <p className="text-xs text-muted-foreground mt-1">últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Mi Equipo</span>
              </CardTitle>
              <CardDescription>Gestiona tu equipo de trabajo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/mi-dashboard')}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Mi Dashboard Personal
              </Button>
              {(isAdmin || isGerente) && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/admin')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Gestión de Empleados
                </Button>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isGerente) && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                  <span>RRHH</span>
                </CardTitle>
                <CardDescription>Gestión de recursos humanos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/rrhh/evaluaciones')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Evaluaciones
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/rrhh/vacaciones')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Gestión de Vacaciones
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span>Reconocimiento</span>
              </CardTitle>
              <CardDescription>Sistema de logros y premios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reconoce/ranking')}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Ver Ranking
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reconoce/desafios')}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Desafíos Activos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
