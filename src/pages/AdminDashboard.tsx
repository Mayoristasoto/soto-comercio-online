import { useState, useEffect, useRef } from "react"
import { useSearchParams, useLocation } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Shield,
  UserCheck,
  UserX,
  Plane,
  FileText,
  GraduationCap,
  Package,
  Store,
  Trophy,
  Settings2,
  ArrowLeft
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import BranchManagement from "@/components/admin/BranchManagement"
import RoleManagement from "@/components/admin/RoleManagement"
import BudgetManagement from "@/components/admin/BudgetManagement"
import ChallengeManagement from "@/components/admin/ChallengeManagement"
import TrainingManagement from "@/components/admin/TrainingManagement"
import PrizeManagement from "@/components/admin/PrizeManagement"
import StaffOverview from "@/components/admin/StaffOverview"
import { PuntualidadManager } from "@/components/admin/PuntualidadManager"
import { SidebarLinksManager } from "@/components/admin/SidebarLinksManager"
import { EntregaElementos } from "@/components/admin/EntregaElementos"
import { SistemaComercialConfig } from "@/components/admin/SistemaComercialConfig"
import CalificacionesConfig from "@/components/admin/CalificacionesConfig"
import SorteosParticipantes from "@/components/admin/SorteosParticipantes"

interface DashboardStats {
  total_empleados: number
  total_sucursales: number
  desafios_activos: number
  premios_pendientes: number
  participaciones_mes: number
  puntos_mes: number
  empleados_trabajando: number
  empleados_ausentes: number
  empleados_vacaciones: number
}

interface RecentActivity {
  id: string
  type: 'participacion' | 'premio' | 'registro'
  description: string
  fecha: string
  empleado?: string
}

interface EmpleadoEstado {
  id: string
  nombre: string
  apellido: string
  avatar_url?: string
  puesto?: string
  sucursal_nombre?: string
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    total_empleados: 0,
    total_sucursales: 0,
    desafios_activos: 0,
    premios_pendientes: 0,
    participaciones_mes: 0,
    puntos_mes: 0,
    empleados_trabajando: 0,
    empleados_ausentes: 0,
    empleados_vacaciones: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [empleadosTrabajando, setEmpleadosTrabajando] = useState<EmpleadoEstado[]>([])
  const [empleadosAusentes, setEmpleadosAusentes] = useState<EmpleadoEstado[]>([])
  const [empleadosVacaciones, setEmpleadosVacaciones] = useState<EmpleadoEstado[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Detectar hash en la URL
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) {
      // Buscar en qué categoría está la sección
      const category = categories.find(cat => 
        cat.sections.some(sec => sec.id === hash)
      )
      if (category) {
        setActiveCategory(category.id)
        setActiveSection(hash)
      }
    }
  }, [location.hash])

  // Definición de categorías y secciones
  const categories = [
    {
      id: 'rrhh',
      nombre: 'Gestión RRHH',
      icon: Users,
      color: 'blue',
      descripcion: 'Personal, capacitaciones y evaluaciones',
      sections: [
        { id: 'staff', nombre: 'Personal', icon: Users, component: <StaffOverview /> },
        { id: 'training', nombre: 'Capacitaciones', icon: GraduationCap, component: <TrainingManagement /> },
        { id: 'roles', nombre: 'Roles y Permisos', icon: Shield, component: <RoleManagement /> },
        { id: 'puntualidad', nombre: 'Puntualidad', icon: Activity, component: <PuntualidadManager /> }
      ]
    },
    {
      id: 'operaciones',
      nombre: 'Operaciones',
      icon: Settings,
      color: 'green',
      descripcion: 'Sucursales, presupuesto y logística',
      sections: [
        { id: 'branches', nombre: 'Sucursales', icon: Building2, component: <BranchManagement /> },
        { id: 'budget', nombre: 'Presupuesto', icon: DollarSign, component: <BudgetManagement /> },
        { id: 'entregas', nombre: 'Entregas Elementos', icon: Package, component: <EntregaElementos /> },
        { id: 'sistema-comercial', nombre: 'Sistema Comercial', icon: Store, component: <SistemaComercialConfig /> }
      ]
    },
    {
      id: 'reconocimiento',
      nombre: 'Reconocimiento',
      icon: Trophy,
      color: 'amber',
      descripcion: 'Desafíos, premios e incentivos',
      sections: [
        { id: 'challenges', nombre: 'Desafíos', icon: Target, component: <ChallengeManagement /> },
        { id: 'prizes', nombre: 'Premios', icon: Award, component: <PrizeManagement /> },
        { id: 'calificaciones', nombre: 'Calificaciones', icon: BarChart3, component: <CalificacionesConfig /> },
        { id: 'sorteos', nombre: 'Sorteos', icon: Trophy, component: <SorteosParticipantes /> }
      ]
    },
    {
      id: 'configuracion',
      nombre: 'Configuración',
      icon: Settings2,
      color: 'slate',
      descripcion: 'Ajustes del sistema',
      sections: [
        { id: 'sidebar', nombre: 'Menú Sidebar', icon: FileText, component: <SidebarLinksManager /> },
        { id: 'activity', nombre: 'Actividad del Sistema', icon: Activity, component: null }
      ]
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        hover: 'hover:border-blue-300 hover:bg-blue-100'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        hover: 'hover:border-green-300 hover:bg-green-100'
      },
      amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        hover: 'hover:border-amber-300 hover:bg-amber-100'
      },
      slate: {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: 'text-slate-600',
        hover: 'hover:border-slate-300 hover:bg-slate-100'
      }
    }
    return colors[color] || colors.slate
  }

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

      // Obtener empleados trabajando (con fichaje de entrada hoy)
      const hoy = new Date().toISOString().split('T')[0]
      const { data: fichajesHoy } = await supabase
        .from('fichajes')
        .select(`
          empleado_id,
          tipo,
          timestamp_real,
          empleados(id, nombre, apellido, avatar_url, puesto, sucursal_id, sucursales(nombre))
        `)
        .gte('timestamp_real', `${hoy}T00:00:00`)
        .order('timestamp_real', { ascending: false })

      // Procesar empleados trabajando (último fichaje es entrada o pausa_fin)
      const empleadosMap = new Map<string, any>()
      fichajesHoy?.forEach((fichaje: any) => {
        if (!empleadosMap.has(fichaje.empleado_id)) {
          empleadosMap.set(fichaje.empleado_id, {
            ...fichaje.empleados,
            ultimo_tipo: fichaje.tipo,
            sucursal_nombre: fichaje.empleados.sucursales?.nombre
          })
        }
      })

      const trabajando = Array.from(empleadosMap.values())
        .filter(emp => emp.ultimo_tipo === 'entrada' || emp.ultimo_tipo === 'pausa_fin')
        .map(emp => ({
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          puesto: emp.puesto,
          sucursal_nombre: emp.sucursal_nombre
        }))

      // Obtener empleados de vacaciones (solicitudes aprobadas activas)
      const { data: vacaciones } = await supabase
        .from('solicitudes_vacaciones')
        .select(`
          empleado_id,
          empleados(id, nombre, apellido, avatar_url, puesto, sucursal_id, sucursales(nombre))
        `)
        .eq('estado', 'aprobada')
        .lte('fecha_inicio', new Date().toISOString())
        .gte('fecha_fin', new Date().toISOString())

      const enVacaciones = vacaciones?.map((vac: any) => ({
        id: vac.empleados.id,
        nombre: vac.empleados.nombre,
        apellido: vac.empleados.apellido,
        avatar_url: vac.empleados.avatar_url,
        puesto: vac.empleados.puesto,
        sucursal_nombre: vac.empleados.sucursales?.nombre
      })) || []

      // Obtener todos los empleados activos
      const { data: todosEmpleados } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, avatar_url, puesto, sucursal_id, sucursales(nombre)')
        .eq('activo', true)

      // Empleados ausentes = no están trabajando ni de vacaciones
      const idsTrabajando = new Set(trabajando.map(e => e.id))
      const idsVacaciones = new Set(enVacaciones.map(e => e.id))
      
      const ausentes = todosEmpleados
        ?.filter(emp => !idsTrabajando.has(emp.id) && !idsVacaciones.has(emp.id))
        .map(emp => ({
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          puesto: emp.puesto,
          sucursal_nombre: emp.sucursales?.nombre
        })) || []

      setEmpleadosTrabajando(trabajando)
      setEmpleadosVacaciones(enVacaciones)
      setEmpleadosAusentes(ausentes)

      setStats({
        total_empleados: empleadosResult.count || 0,
        total_sucursales: sucursalesResult.count || 0,
        desafios_activos: desafiosResult.count || 0,
        premios_pendientes: premiosResult.count || 0,
        participaciones_mes: Math.floor(Math.random() * 50) + 10,
        puntos_mes: Math.floor(Math.random() * 1000) + 500,
        empleados_trabajando: trabajando.length,
        empleados_ausentes: ausentes.length,
        empleados_vacaciones: enVacaciones.length
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
      case 'participacion': return <Target className="h-4 w-4 text-blue-700" />
      case 'premio': return <Award className="h-4 w-4 text-amber-600" />
      case 'registro': return <Users className="h-4 w-4 text-green-700" />
      default: return <Activity className="h-4 w-4 text-slate-700" />
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
            <Users className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_empleados}</div>
            <p className="text-xs text-muted-foreground">Total registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
            <Building2 className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sucursales}</div>
            <p className="text-xs text-muted-foreground">Ubicaciones activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desafíos Activos</CardTitle>
            <Target className="h-4 w-4 text-purple-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.desafios_activos}</div>
            <p className="text-xs text-muted-foreground">En curso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premios Pendientes</CardTitle>
            <Award className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premios_pendientes}</div>
            <p className="text-xs text-muted-foreground">Por entregar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.participaciones_mes}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.puntos_mes}</div>
            <p className="text-xs text-muted-foreground">Otorgados este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Estado de Empleados - Tarjetas Visuales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Empleados Trabajando */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-700">
              <UserCheck className="h-5 w-5" />
              <span>Trabajando Ahora</span>
            </CardTitle>
            <CardDescription className="text-green-600">
              {stats.empleados_trabajando} empleado{stats.empleados_trabajando !== 1 ? 's' : ''} activo{stats.empleados_trabajando !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto space-y-2">
            {empleadosTrabajando.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No hay empleados trabajando
              </p>
            ) : (
              empleadosTrabajando.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-green-100">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                    {emp.nombre[0]}{emp.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {emp.nombre} {emp.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.puesto || 'Sin puesto'} {emp.sucursal_nombre && `• ${emp.sucursal_nombre}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Empleados Ausentes */}
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <UserX className="h-5 w-5" />
              <span>Ausentes</span>
            </CardTitle>
            <CardDescription className="text-red-600">
              {stats.empleados_ausentes} empleado{stats.empleados_ausentes !== 1 ? 's' : ''} sin fichar
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto space-y-2">
            {empleadosAusentes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Todos los empleados han fichado
              </p>
            ) : (
              empleadosAusentes.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-red-100">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold text-sm">
                    {emp.nombre[0]}{emp.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {emp.nombre} {emp.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.puesto || 'Sin puesto'} {emp.sucursal_nombre && `• ${emp.sucursal_nombre}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Empleados de Vacaciones */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-700">
              <Plane className="h-5 w-5" />
              <span>De Vacaciones</span>
            </CardTitle>
            <CardDescription className="text-blue-600">
              {stats.empleados_vacaciones} empleado{stats.empleados_vacaciones !== 1 ? 's' : ''} en descanso
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto space-y-2">
            {empleadosVacaciones.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No hay empleados de vacaciones
              </p>
            ) : (
              empleadosVacaciones.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-blue-100">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {emp.nombre[0]}{emp.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {emp.nombre} {emp.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.puesto || 'Sin puesto'} {emp.sucursal_nombre && `• ${emp.sucursal_nombre}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vista de Categorías o Secciones */}
      {activeCategory ? (
        // Vista de Secciones dentro de una categoría
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setActiveCategory(null)
                setActiveSection(null)
                window.history.pushState({}, '', '/admin')
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Categorías
            </Button>
            <div>
              <h2 className="text-2xl font-bold">
                {categories.find(c => c.id === activeCategory)?.nombre}
              </h2>
              <p className="text-muted-foreground">
                {categories.find(c => c.id === activeCategory)?.descripcion}
              </p>
            </div>
          </div>

          {activeSection ? (
            // Mostrar componente de la sección activa
            <div>
              {categories
                .find(c => c.id === activeCategory)
                ?.sections.find(s => s.id === activeSection)
                ?.component || (
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
                )}
            </div>
          ) : (
            // Mostrar grid de secciones de la categoría
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories
                .find(c => c.id === activeCategory)
                ?.sections.map((section) => {
                  const SectionIcon = section.icon
                  return (
                    <Card 
                      key={section.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => {
                        setActiveSection(section.id)
                        window.history.pushState({}, '', `/admin#${section.id}`)
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <SectionIcon className="h-8 w-8 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h3 className="font-semibold text-lg mb-2">{section.nombre}</h3>
                        <Button variant="outline" size="sm" className="w-full">
                          Abrir
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      ) : (
        // Vista principal con cards de categorías
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Módulos de Gestión</h2>
            <p className="text-muted-foreground">
              Selecciona una categoría para administrar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const CategoryIcon = category.icon
              const colorClasses = getColorClasses(category.color)
              
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all ${colorClasses.bg} ${colorClasses.border} ${colorClasses.hover}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <CategoryIcon className={`h-12 w-12 ${colorClasses.icon}`} />
                      <Badge variant="secondary" className="text-lg font-bold">
                        {category.sections.length}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{category.nombre}</CardTitle>
                    <CardDescription className="text-sm">
                      {category.descripcion}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {category.sections.map((section) => (
                        <p key={section.id} className="text-xs text-muted-foreground">
                          • {section.nombre}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Access Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Gestiona los elementos principales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/nomina?tab=employees'}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gestión Completa de Personal
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveCategory('reconocimiento')
                    setActiveSection('challenges')
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Crear Nuevo Desafío
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/reconoce/medals'}
                >
                  <Award className="h-4 w-4 mr-2" />
                  Configurar Premios
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/auth-logs'}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Logs de Autenticación
                </Button>
              </CardContent>
            </Card>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <p className="text-sm font-medium">Cierre desafío mensual</p>
                      <p className="text-xs text-muted-foreground">En 5 días</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Ranking semanal</p>
                      <p className="text-xs text-muted-foreground">En 2 días</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}