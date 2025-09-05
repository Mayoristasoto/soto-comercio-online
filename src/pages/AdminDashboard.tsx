import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  Building2, 
  Target, 
  Award, 
  TrendingUp, 
  DollarSign,
  Activity,
  Calendar,
  BarChart3,
  Settings,
  Shield
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import EmployeeManagement from "@/components/admin/EmployeeManagement"
import BranchManagement from "@/components/admin/BranchManagement"
import RoleManagement from "@/components/admin/RoleManagement"
import BudgetManagement from "@/components/admin/BudgetManagement"
import ChallengeManagement from "@/components/admin/ChallengeManagement"
import TrainingManagement from "@/components/admin/TrainingManagement"

interface DashboardStats {
  total_empleados: number
  total_sucursales: number
  desafios_activos: number
  premios_pendientes: number
  participaciones_mes: number
  puntos_mes: number
}

interface RecentActivity {
  id: string
  type: 'participacion' | 'premio' | 'registro'
  description: string
  fecha: string
  empleado?: string
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    total_empleados: 0,
    total_sucursales: 0,
    desafios_activos: 0,
    premios_pendientes: 0,
    participaciones_mes: 0,
    puntos_mes: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Verificar si el usuario es admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: empleado } = await supabase
        .from('empleados')
        .select('rol')
        .eq('user_id', user.id)
        .single()

      if (empleado?.rol !== 'admin_rrhh') {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder al panel de administración",
          variant: "destructive"
        })
        return
      }

      // Cargar estadísticas
      const [
        empleadosResult,
        sucursalesResult,
        desafiosResult,
        premiosResult
      ] = await Promise.all([
        supabase.from('empleados').select('id', { count: 'exact' }),
        supabase.from('sucursales').select('id', { count: 'exact' }),
        supabase.from('desafios').select('id', { count: 'exact' }).eq('estado', 'activo'),
        supabase.from('asignaciones_premio').select('id', { count: 'exact' }).eq('estado', 'pendiente')
      ])

      setStats({
        total_empleados: empleadosResult.count || 0,
        total_sucursales: sucursalesResult.count || 0,
        desafios_activos: desafiosResult.count || 0,
        premios_pendientes: premiosResult.count || 0,
        participaciones_mes: Math.floor(Math.random() * 50) + 10, // Mock por ahora
        puntos_mes: Math.floor(Math.random() * 1000) + 500 // Mock por ahora
      })

      // Mock de actividad reciente
      setRecentActivity([
        {
          id: '1',
          type: 'participacion',
          description: 'Juan Pérez completó el desafío "Ventas Semanales"',
          fecha: new Date().toISOString(),
          empleado: 'Juan Pérez'
        },
        {
          id: '2',
          type: 'premio',
          description: 'Se asignó premio mensual a María García',
          fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          empleado: 'María García'
        },
        {
          id: '3',
          type: 'registro',
          description: 'Nuevo empleado registrado: Carlos López',
          fecha: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          empleado: 'Carlos López'
        }
      ])

    } catch (error) {
      console.error('Error cargando dashboard:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFecha = (fecha: string) => {
    const now = new Date()
    const date = new Date(fecha)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Hace unos minutos'
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    return date.toLocaleDateString('es-AR')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'participacion': return <Target className="h-4 w-4 text-blue-600" />
      case 'premio': return <Award className="h-4 w-4 text-yellow-600" />
      case 'registro': return <Users className="h-4 w-4 text-green-600" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Panel de control del sistema Soto Reconoce
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reportes
          </Button>
          <Button size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_empleados}</div>
            <p className="text-xs text-muted-foreground">Total registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sucursales}</div>
            <p className="text-xs text-muted-foreground">Ubicaciones activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desafíos Activos</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.desafios_activos}</div>
            <p className="text-xs text-muted-foreground">En curso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premios Pendientes</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premios_pendientes}</div>
            <p className="text-xs text-muted-foreground">Por entregar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.participaciones_mes}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.puntos_mes}</div>
            <p className="text-xs text-muted-foreground">Otorgados este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="branches">Sucursales</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          <TabsTrigger value="challenges">Desafíos</TabsTrigger>
          <TabsTrigger value="training">Capacitaciones</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Gestiona los elementos principales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Empleados
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    const challengeTab = document.querySelector('[value="challenges"]') as HTMLElement
                    challengeTab?.click()
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Crear Nuevo Desafío
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  Configurar Premios
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Reportes Detallados
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Actividad Reciente</span>
                </CardTitle>
                <CardDescription>
                  Últimas acciones en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay actividad reciente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-2 rounded border">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFecha(activity.fecha)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards - moved to dashboard tab */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen Semanal</CardTitle>
                <CardDescription>
                  Estadísticas de la semana actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Participaciones en desafíos</span>
                    <Badge variant="secondary">+25%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Nuevos registros</span>
                    <Badge variant="secondary">+12%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Premios entregados</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>
                  Fechas importantes y vencimientos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm">Cierre desafío mensual</p>
                      <p className="text-xs text-muted-foreground">En 5 días</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm">Ranking semanal</p>
                      <p className="text-xs text-muted-foreground">En 2 días</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>

        <TabsContent value="branches">
          <BranchManagement />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetManagement />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengeManagement />
        </TabsContent>

        <TabsContent value="training">
          <TrainingManagement />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Actividad Completa del Sistema</span>
              </CardTitle>
              <CardDescription>
                Registro detallado de todas las acciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded border">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFecha(activity.fecha)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}