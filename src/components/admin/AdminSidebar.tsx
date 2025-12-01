import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
  Clock,
  Package,
  Target,
  Award,
  Trophy,
  Settings,
  Shield,
  BarChart3,
  FileText,
  Map,
  Wrench,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Image,
  Calculator
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface NavItem {
  title: string
  url: string
  icon: any
}

interface NavGroup {
  title: string
  icon: any
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    title: "Operaciones Diarias",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Fichero", url: "/fichero", icon: Clock },
      { title: "Evaluaciones", url: "/evaluaciones", icon: FileText },
      { title: "Solicitudes", url: "/solicitudes", icon: FileText },
      { title: "Anotaciones", url: "/anotaciones", icon: FileText },
    ]
  },
  {
    title: "Gestión de Personal",
    icon: Users,
    items: [
      { title: "Empleados", url: "/admin#empleados", icon: Users },
      { title: "Puestos de Trabajo", url: "/admin#puestos", icon: Wrench },
      { title: "Sucursales", url: "/admin#sucursales", icon: Building2 },
      { title: "Asignar Sucursales", url: "/admin/asignar-sucursales", icon: Building2 },
      { title: "Onboarding", url: "/admin/onboarding", icon: Award },
      { title: "Documentos", url: "/admin#documentos", icon: FileText },
      { title: "Entrega de Elementos", url: "/admin#entregas", icon: Package },
      { title: "Ausencias Médicas", url: "/admin#ausencias-medicas", icon: FileText },
    ]
  },
  {
    title: "Nómina y Payroll",
    icon: Calculator,
    items: [
      { title: "Gestión de Payroll", url: "/rrhh/payroll", icon: Calculator },
      { title: "Puntualidad", url: "/admin#puntualidad", icon: Clock },
      { title: "Ranking de Incidencias", url: "/admin/ranking-incidencias", icon: BarChart3 },
    ]
  },
  {
    title: "Reconocimiento y Gamificación",
    icon: Trophy,
    items: [
      { title: "Desafíos", url: "/admin#desafios", icon: Target },
      { title: "Desafíos TV", url: "/admin#desafios-tv-config", icon: Users },
      { title: "Premios", url: "/admin#premios", icon: Award },
      { title: "Presupuestos", url: "/admin#presupuesto", icon: BarChart3 },
      { title: "Capacitaciones", url: "/admin#capacitaciones", icon: FileText },
    ]
  },
  {
    title: "Configuración y Seguridad",
    icon: Settings,
    items: [
      { title: "Seguridad", url: "/admin/seguridad", icon: Shield },
      { title: "Logs de Autenticación", url: "/admin/auth-logs", icon: FileText },
      { title: "Aprobar Fotos Faciales", url: "/admin/aprobar-fotos-faciales", icon: Users },
      { title: "Roles y Permisos", url: "/admin#roles", icon: UserCog },
      { title: "Configuración Sistema", url: "/admin/configuracion", icon: Settings },
      { title: "Calificaciones QR", url: "/admin#calificaciones", icon: Trophy },
      { title: "Sorteos", url: "/admin#sorteos", icon: Trophy },
      { title: "Screenshots Instructivo", url: "/admin/instructivo-screenshots", icon: Image },
    ]
  }
]

export function AdminSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = state === "collapsed"
  
  const [openGroups, setOpenGroups] = useState<string[]>(
    navigationGroups.map(group => group.title)
  )

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(t => t !== groupTitle)
        : [...prev, groupTitle]
    )
  }

  const isActive = (url: string) => {
    if (url === "/admin") {
      return location.pathname === "/admin" && !location.hash
    }
    if (url.includes("#")) {
      return location.pathname === url.split("#")[0] && location.hash === "#" + url.split("#")[1]
    }
    return location.pathname === url
  }

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.url))
  }

  return (
    <Sidebar
      className={cn(
        "border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarContent className="gap-0">
        <div className="px-3 py-4">
          <h2 className={cn(
            "font-bold text-lg transition-opacity duration-200",
            collapsed ? "opacity-0 hidden" : "opacity-100"
          )}>
            Administración
          </h2>
          {collapsed && (
            <div className="flex items-center justify-center">
              <Settings className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Botón para volver al menú principal */}
        <div className="px-3 pb-2">
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 transition-all",
              collapsed && "px-2 justify-center"
            )}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Volver al Menú Principal</span>}
          </Button>
        </div>
        
        <Separator className="mx-3" />

        {navigationGroups.map((group) => {
          const isOpen = openGroups.includes(group.title)
          const isGroupHighlighted = isGroupActive(group)

          return (
            <Collapsible
              key={group.title}
              open={isOpen && !collapsed}
              onOpenChange={() => toggleGroup(group.title)}
              className="group/collapsible"
            >
              <SidebarGroup className="py-0">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel
                    className={cn(
                      "group/label cursor-pointer transition-colors",
                      "flex items-center justify-between px-3 py-3 my-1 rounded-md",
                      "border-l-4",
                      isGroupHighlighted 
                        ? "bg-primary/15 border-primary font-bold hover:bg-primary/20" 
                        : "bg-muted border-transparent hover:bg-muted/80 hover:border-muted-foreground/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <group.icon className={cn(
                        "h-5 w-5 shrink-0",
                        isGroupHighlighted ? "text-primary" : "text-muted-foreground"
                      )} />
                      {!collapsed && (
                        <span className={cn(
                          "text-sm font-semibold",
                          isGroupHighlighted ? "text-primary" : "text-foreground"
                        )}>
                          {group.title}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      isOpen ? (
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          isGroupHighlighted ? "text-primary" : "text-muted-foreground"
                        )} />
                      ) : (
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          isGroupHighlighted ? "text-primary" : "text-muted-foreground"
                        )} />
                      )
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                <CollapsibleContent className={cn(
                  "transition-all duration-200",
                  collapsed && "hidden"
                )}>
                  <SidebarGroupContent className="pl-2">
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const active = isActive(item.url)
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              className={cn(
                                "transition-all duration-200 my-0.5 rounded-md",
                                active 
                                  ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm" 
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                              tooltip={collapsed ? item.title : undefined}
                            >
                              <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2">
                                <item.icon className={cn(
                                  "h-4 w-4 shrink-0",
                                  active && "text-primary-foreground"
                                )} />
                                {!collapsed && <span className="text-sm">{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}
