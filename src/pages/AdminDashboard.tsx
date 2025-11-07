import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Building2, 
  Target, 
  Award,
  Activity,
  BarChart3,
  Settings,
  Shield,
  FileText,
  GraduationCap,
  Package,
  Store,
  Trophy,
  Settings2,
  DollarSign
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
import { SistemaComercialConfig } from "@/components/admin/SistemaComercialConfig"
import CalificacionesConfig from "@/components/admin/CalificacionesConfig"
import SorteosParticipantes from "@/components/admin/SorteosParticipantes"
import { TareasConfiguracion } from "@/components/admin/TareasConfiguracion"

export default function AdminDashboard() {
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAccess()
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
        { id: 'tareas-config', nombre: 'Configuración de Tareas', icon: FileText, component: <TareasConfiguracion /> },
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

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }

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
        navigate('/dashboard')
        return
      }
    } catch (error) {
      console.error('Error verificando acceso:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Administración</h1>
          <p className="text-muted-foreground">
            Gestión del sistema Soto Reconoce
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/dashboard')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin/auth-logs')}
          >
            <Shield className="h-4 w-4 mr-2" />
            Logs de Seguridad
          </Button>
        </div>
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
              <Settings className="h-4 w-4 mr-2" />
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
                        <span>Sección no disponible</span>
                      </CardTitle>
                      <CardDescription>
                        Esta sección está en desarrollo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        El contenido de esta sección estará disponible próximamente.
                      </p>
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

          {/* Quick Access Info */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Acceso Rápido</span>
              </CardTitle>
              <CardDescription>
                Enlaces directos a funciones importantes
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button 
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => navigate('/admin/dashboard')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-semibold">Dashboard</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Ver estadísticas</span>
                </div>
              </Button>
              
              <Button 
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => navigate('/rrhh/nomina')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">Personal</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Gestión completa</span>
                </div>
              </Button>
              
              <Button 
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => navigate('/admin/gondolas')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span className="font-semibold">Góndolas</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Mapa interactivo</span>
                </div>
              </Button>
              
              <Button 
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => navigate('/admin/auth-logs')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-semibold">Seguridad</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Logs de acceso</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}