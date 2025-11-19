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
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Inicio", url: "/admin", icon: LayoutDashboard }
    ]
  },
  {
    title: "Gestión de Personal",
    icon: Users,
    items: [
      { title: "Empleados", url: "/admin#empleados", icon: Users },
      { title: "Sucursales", url: "/admin#sucursales", icon: Building2 },
      { title: "Roles y Permisos", url: "/admin#roles", icon: UserCog },
      { title: "Gestión de Onboarding", url: "/admin/onboarding", icon: Award },
    ]
  },
  {
    title: "Nómina y Payroll",
    icon: Calculator,
    items: [
      { title: "Gestión de Payroll", url: "/rrhh/payroll", icon: Calculator },
      { title: "Ausencias Médicas", url: "/admin#ausencias-medicas", icon: FileText },
    ]
  },
  {
    title: "Operaciones",
    icon: Clock,
    items: [
      { title: "Asignar Sucursales", url: "/admin/asignar-sucursales", icon: Building2 },
      { title: "Ranking de Incidencias", url: "/admin/ranking-incidencias", icon: BarChart3 },
      { title: "Entrega Elementos", url: "/admin#entregas", icon: Package },
      { title: "Puntualidad", url: "/admin#puntualidad", icon: Clock },
    ]
  },
  {
    title: "Reconocimiento",
    icon: Award,
    items: [
      { title: "Desafíos", url: "/admin#desafios", icon: Target },
      { title: "Premios", url: "/admin#premios", icon: Award },
      { title: "Presupuestos", url: "/admin#presupuesto", icon: BarChart3 },
      { title: "Capacitaciones", url: "/admin#capacitaciones", icon: FileText },
      { title: "Participantes Desafíos TV", url: "/admin#desafios-tv-config", icon: Users },
    ]
  },
  {
    title: "Seguridad y Auditoría",
    icon: Shield,
    items: [
      { title: "Panel de Seguridad", url: "/admin/seguridad", icon: Shield },
      { title: "Logs de Autenticación", url: "/admin/auth-logs", icon: FileText },
      { title: "Aprobar Fotos Faciales", url: "/admin/aprobar-fotos-faciales", icon: Users },
    ]
  },
  {
    title: "Configuración del Sistema",
    icon: Settings,
    items: [
      { title: "Sistema Comercial", url: "/admin#sistema-comercial", icon: Wrench },
      { title: "Calificaciones", url: "/admin#calificaciones", icon: Trophy },
      { title: "Sorteos", url: "/admin#sorteos", icon: Trophy },
      { title: "Enlaces Sidebar", url: "/admin#sidebar-links", icon: Settings },
    ]
  },
  {
    title: "Contenido y Recursos",
    icon: Image,
    items: [
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
                      "group/label cursor-pointer hover:bg-accent transition-colors",
                      "flex items-center justify-between px-3 py-2",
                      isGroupHighlighted && "bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <group.icon className={cn(
                        "h-4 w-4 shrink-0",
                        isGroupHighlighted && "text-primary"
                      )} />
                      {!collapsed && (
                        <span className={cn(
                          "text-sm font-bold",
                          isGroupHighlighted && "text-primary"
                        )}>
                          {group.title}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      isOpen ? (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 transition-transform" />
                      )
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                <CollapsibleContent className={cn(
                  "transition-all duration-200",
                  collapsed && "hidden"
                )}>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const active = isActive(item.url)
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              className={cn(
                                "transition-all duration-200",
                                active && "bg-primary/10 text-primary font-medium hover:bg-primary/20"
                              )}
                              tooltip={collapsed ? item.title : undefined}
                            >
                              <NavLink to={item.url} className="flex items-center gap-3 px-3">
                                <item.icon className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>{item.title}</span>}
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
