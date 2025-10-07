import { 
  Home, 
  Award, 
  Clock, 
  CheckSquare, 
  Settings, 
  Users,
  BarChart3,
  Calendar,
  Trophy,
  Target,
  Building2,
  UserCheck,
  FileText,
  User,
  ClipboardCheck,
  Plane,
  FileSignature
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

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

interface UnifiedSidebarProps {
  userInfo: UserInfo | null
}

export function UnifiedSidebar({ userInfo }: UnifiedSidebarProps) {
  const location = useLocation()
  
  const mainModules = [
    {
      title: "Reconocimiento",
      url: "/reconoce",
      icon: Award,
      description: "Programa de reconocimiento y premios"
    },
    {
      title: "Control Horario",
      url: "/fichero", 
      icon: Clock,
      description: "Fichado con reconocimiento facial"
    },
    {
      title: "Gestión de Tareas",
      url: "/tareas",
      icon: CheckSquare,
      description: "Asignación y seguimiento de tareas"
    }
  ]

  const reconoceSubmenu = [
    { title: "Dashboard", url: "/reconoce/dashboard", icon: BarChart3 },
    { title: "Ranking", url: "/reconoce/ranking", icon: Trophy },
    { title: "Desafíos", url: "/reconoce/desafios", icon: Target },
    { title: "Insignias", url: "/reconoce/insignias", icon: Award },
    { title: "Premios", url: "/reconoce/premios", icon: Trophy },
  ]

  const tareasSubmenu = [
    { title: "Mis Tareas", url: "/tareas/mis-tareas", icon: CheckSquare },
    { title: "Asignadas", url: "/tareas/asignadas", icon: Users },
    { title: "Calendario", url: "/tareas/calendario", icon: Calendar },
    { title: "Reportes", url: "/tareas/reportes", icon: BarChart3 },
  ]

  const adminItems = [
    { title: "Gestión Empleados", url: "/admin/empleados", icon: Users },
    { title: "Evaluaciones", url: "/evaluaciones", icon: ClipboardCheck },
    { title: "Vacaciones", url: "/vacaciones", icon: Plane },
    { title: "Solicitudes", url: "/solicitudes", icon: FileSignature },
    { title: "Módulo Nómina", url: "/nomina", icon: FileText },
    { title: "Sucursales", url: "/admin/sucursales", icon: Building2 },
    { title: "Configuración", url: "/admin/configuracion", icon: Settings },
  ]
  
  // Items solo para gerentes
  const gerenteItems = [
    { title: "Evaluaciones", url: "/evaluaciones", icon: ClipboardCheck },
    { title: "Vacaciones", url: "/vacaciones", icon: Plane },
    { title: "Solicitudes", url: "/solicitudes", icon: FileSignature },
  ]

  // Items para todos los empleados
  const empleadoItems = [
    { title: "Mi Dashboard", url: "/mi-dashboard", icon: User },
    { title: "Vacaciones", url: "/vacaciones", icon: Plane },
    { title: "Solicitudes", url: "/solicitudes", icon: FileSignature },
  ]

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const getRoleBadgeVariant = (rol: string) => {
    switch (rol) {
      case 'admin_rrhh': return 'destructive'
      case 'gerente_sucursal': return 'default'
      case 'lider_grupo': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center space-x-2 px-2 py-2">
          <img 
            src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
            alt="Soto Logo" 
            className="h-8 w-auto"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Sistema Soto</span>
            <span className="text-xs text-muted-foreground">Multi-Sucursal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard Personal - Solo para empleados */}
        {userInfo?.rol === 'empleado' && (
          <SidebarGroup>
            <SidebarGroupLabel>Mi Espacio Personal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {empleadoItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive("/reconoce/premios")}
                    tooltip="Canjea tus puntos por premios"
                  >
                    <NavLink to="/reconoce/premios">
                      <Trophy className="h-4 w-4" />
                      <span>Canje de Premios</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulos Principales - Solo para roles superiores */}
        {userInfo?.rol !== 'empleado' && (
          <SidebarGroup>
            <SidebarGroupLabel>Módulos Principales</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainModules.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={item.description}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Submenú Reconocimiento - Solo para roles superiores */}
        {userInfo?.rol !== 'empleado' && isActive("/reconoce") && (
          <SidebarGroup>
            <SidebarGroupLabel>Reconocimiento</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {reconoceSubmenu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Submenú Tareas - Solo para roles superiores */}
        {userInfo?.rol !== 'empleado' && isActive("/tareas") && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestión de Tareas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tareasSubmenu.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administración (solo para admins) */}
        {userInfo?.rol === 'admin_rrhh' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Módulos de Gerente (solo para gerentes) */}
        {userInfo?.rol === 'gerente_sucursal' && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestión de Sucursal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {gerenteItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                    >
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {userInfo && (
          <div className="p-3 border-t">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userInfo.avatar_url} />
                <AvatarFallback>
                  {getInitials(userInfo.nombre, userInfo.apellido)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {userInfo.nombre} {userInfo.apellido}
                </p>
                <div className="flex items-center space-x-1">
                  <Badge 
                    variant={getRoleBadgeVariant(userInfo.rol)} 
                    className="text-xs"
                  >
                    {userInfo.rol === 'admin_rrhh' ? 'Admin' : 
                     userInfo.rol === 'gerente_sucursal' ? 'Gerente' : 
                     userInfo.rol === 'lider_grupo' ? 'Líder' : 'Empleado'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}