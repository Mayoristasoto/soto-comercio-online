import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "lucide-react"

interface AppPage {
  id: string
  nombre: string
  path: string
  icon: string | null
  roles_permitidos: string[] | null
  visible: boolean
  mostrar_en_sidebar: boolean | null
  parent_id: string | null
  orden: number
}

interface DashboardSectionDef {
  key: string
  title: string
  description: string
  icon: React.ReactNode
}

const DASHBOARD_SECTIONS: DashboardSectionDef[] = [
  { key: "tareas", title: "Mis Tareas Asignadas", description: "Ve y actualiza el estado de tareas pendientes", icon: <CheckCircle2 className="h-5 w-5 text-blue-600" /> },
  { key: "capacitaciones", title: "Mis Capacitaciones", description: "Accede a materiales de estudio asignados", icon: <BookOpen className="h-5 w-5 text-green-600" /> },
  { key: "documentos", title: "Mis Documentos", description: "Revisa y confirma lectura de documentos", icon: <FileText className="h-5 w-5 text-purple-600" /> },
  { key: "logros", title: "Mis Logros", description: "Galería de medallas y reconocimientos", icon: <Award className="h-5 w-5 text-yellow-600" /> },
  { key: "calificaciones", title: "Calificaciones de Clientes", description: "Visualiza calificaciones recibidas", icon: <Star className="h-5 w-5 text-yellow-500" /> },
  { key: "entregas", title: "Entregas de Elementos", description: "Confirma recepción de elementos", icon: <Package className="h-5 w-5 text-orange-600" /> },
  { key: "eventos", title: "Próximos Eventos", description: "Cumpleaños y aniversarios del equipo", icon: <Calendar className="h-5 w-5 text-cyan-600" /> },
  { key: "empleados_sucursal", title: "Empleados de Mi Sucursal", description: "Gestión del personal a cargo", icon: <Users className="h-5 w-5 text-indigo-600" /> },
  { key: "fichajes_equipo", title: "Fichajes del Equipo", description: "Control de asistencia de empleados", icon: <Clock className="h-5 w-5 text-teal-600" /> },
  { key: "cambios_horario", title: "Cambios de Horario", description: "Solicitar cambios para empleados", icon: <Clock className="h-5 w-5 text-amber-600" /> },
  { key: "aprobar_vacaciones", title: "Aprobar Vacaciones", description: "Gestionar solicitudes de vacaciones", icon: <Calendar className="h-5 w-5 text-green-600" /> },
  { key: "evaluaciones", title: "Evaluaciones", description: "Realizar evaluaciones de desempeño", icon: <BarChart3 className="h-5 w-5 text-blue-600" /> },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  User: <User className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  CheckCircle2: <CheckCircle2 className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  Trophy: <Trophy className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  Award: <Award className="h-4 w-4" />,
  Star: <Star className="h-4 w-4" />,
  Package: <Package className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  Target: <Target className="h-4 w-4" />,
  BarChart3: <BarChart3 className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
}

export function RolePreview() {
  const [selectedRole, setSelectedRole] = useState<'empleado' | 'gerente_sucursal'>('empleado')
  const [appPages, setAppPages] = useState<AppPage[]>([])
  const [dashboardConfig, setDashboardConfig] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [togglingPage, setTogglingPage] = useState<string | null>(null)
  const [togglingSection, setTogglingSection] = useState<string | null>(null)
  const { toast } = useToast()

  const loadAppPages = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_pages")
      .select("*")
      .eq("visible", true)
      .eq("mostrar_en_sidebar", true)
      .order("orden", { ascending: true })

    if (error) {
      console.error("Error loading app_pages:", error)
      return
    }
    setAppPages(data || [])
  }, [])

  const loadDashboardConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from("role_dashboard_sections")
      .select("*")
      .eq("rol", selectedRole)

    if (error) {
      console.error("Error loading dashboard config:", error)
      return
    }

    const config: Record<string, boolean> = {}
    // Default all sections to true
    DASHBOARD_SECTIONS.forEach(s => { config[s.key] = true })
    // Override with DB values
    data?.forEach((row: any) => {
      config[row.seccion_key] = row.habilitado
    })
    setDashboardConfig(config)
  }, [selectedRole])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadAppPages(), loadDashboardConfig()])
      setLoading(false)
    }
    load()
  }, [loadAppPages, loadDashboardConfig])

  const handleToggleSidebarItem = async (page: AppPage, enabled: boolean) => {
    setTogglingPage(page.id)
    const currentRoles = page.roles_permitidos || []
    let newRoles: string[]

    if (enabled) {
      newRoles = [...new Set([...currentRoles, selectedRole])]
    } else {
      newRoles = currentRoles.filter(r => r !== selectedRole)
    }

    const { error } = await supabase
      .from("app_pages")
      .update({ roles_permitidos: newRoles, updated_at: new Date().toISOString() })
      .eq("id", page.id)

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el acceso", variant: "destructive" })
    } else {
      toast({ title: enabled ? "Acceso habilitado" : "Acceso deshabilitado", description: `${page.nombre} para ${selectedRole}` })
      // Update local state
      setAppPages(prev => prev.map(p => p.id === page.id ? { ...p, roles_permitidos: newRoles } : p))
    }
    setTogglingPage(null)
  }

  const handleToggleDashboardSection = async (sectionKey: string, enabled: boolean) => {
    setTogglingSection(sectionKey)

    const { error } = await supabase
      .from("role_dashboard_sections")
      .upsert({
        rol: selectedRole,
        seccion_key: sectionKey,
        habilitado: enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: "rol,seccion_key" })

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar la sección", variant: "destructive" })
    } else {
      toast({ title: enabled ? "Sección habilitada" : "Sección deshabilitada", description: `${DASHBOARD_SECTIONS.find(s => s.key === sectionKey)?.title} para ${selectedRole}` })
      setDashboardConfig(prev => ({ ...prev, [sectionKey]: enabled }))
    }
    setTogglingSection(null)
  }

  const isPageEnabledForRole = (page: AppPage) => {
    return (page.roles_permitidos || []).includes(selectedRole)
  }

  const sidebarEnabled = appPages.filter(p => isPageEnabledForRole(p)).length
  const sidebarDisabled = appPages.length - sidebarEnabled
  const dashboardEnabled = Object.values(dashboardConfig).filter(Boolean).length

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Vista Previa de Roles</h2>
          <p className="text-sm text-muted-foreground">
            Activa o desactiva secciones para cada rol del sistema
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
                  Toggle para habilitar/deshabilitar accesos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {appPages.map((page) => {
                      const enabled = isPageEnabledForRole(page)
                      const iconNode = ICON_MAP[page.icon || "FileText"] || <FileText className="h-4 w-4" />
                      return (
                        <div 
                          key={page.id}
                          className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                            enabled 
                              ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                              : 'bg-muted/50 border border-border opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {iconNode}
                            <span className="text-sm truncate">{page.nombre}</span>
                          </div>
                          <Switch
                            checked={enabled}
                            disabled={togglingPage === page.id}
                            onCheckedChange={(checked) => handleToggleSidebarItem(page, checked)}
                          />
                        </div>
                      )
                    })}
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
                  Toggle para habilitar/deshabilitar secciones del dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DASHBOARD_SECTIONS.map((section) => {
                      const enabled = dashboardConfig[section.key] !== false
                      return (
                        <div 
                          key={section.key}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            enabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                          }`}
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
                          <Switch
                            checked={enabled}
                            disabled={togglingSection === section.key}
                            onCheckedChange={(checked) => handleToggleDashboardSection(section.key, checked)}
                          />
                        </div>
                      )
                    })}
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
                    {sidebarEnabled}
                  </p>
                  <p className="text-sm text-muted-foreground">Menús Accesibles</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <p className="text-2xl font-bold text-red-600">
                    {sidebarDisabled}
                  </p>
                  <p className="text-sm text-muted-foreground">Menús Restringidos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardEnabled}
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
