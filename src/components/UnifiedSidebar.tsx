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
  FileSignature,
  FileWarning
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
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
import { useSidebarLinks } from "@/hooks/useSidebarLinks"

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


// Mapa de iconos disponibles
const iconMap: Record<string, any> = {
  Home, Award, Clock, CheckSquare, Settings, Users, BarChart3,
  Calendar, Trophy, Target, Building2, UserCheck, FileText,
  User, ClipboardCheck, Plane, FileSignature, FileWarning
}

export function UnifiedSidebar({ userInfo }: UnifiedSidebarProps) {
  const location = useLocation()
  const { links, loading } = useSidebarLinks(userInfo?.rol || null)
  
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

  const getIcon = (iconName: string) => {
    return iconMap[iconName] || FileText
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
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Cargando menú...
          </div>
        ) : (
          <>
            {/* Renderizar links dinámicamente desde la base de datos */}
            {links.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Navegación</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {links.map((link) => {
                      // Si es un separador, renderizar Separator
                      if ((link as any).tipo === 'separator') {
                        return (
                          <div key={link.id} className="px-2 py-2">
                            <Separator />
                            {link.label && (
                              <p className="text-xs text-muted-foreground mt-2 px-2 font-medium">
                                {link.label}
                              </p>
                            )}
                          </div>
                        )
                      }

                      // Renderizar link normal
                      const Icon = getIcon(link.icon)
                      return (
                        <div key={link.id}>
                          <SidebarMenuItem>
                            <SidebarMenuButton 
                              asChild 
                              isActive={isActive(link.path)}
                              tooltip={link.descripcion || link.label}
                            >
                              <NavLink to={link.path}>
                                <Icon className="h-4 w-4" />
                                <span>{link.label}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          
                          {/* Renderizar hijos si existen */}
                          {link.children && link.children.length > 0 && (
                            <div className="ml-4 mt-1 space-y-1">
                              {link.children.map((child) => {
                                const ChildIcon = getIcon(child.icon)
                                return (
                                  <SidebarMenuItem key={child.id}>
                                    <SidebarMenuButton 
                                      asChild 
                                      isActive={location.pathname === child.path}
                                      tooltip={child.descripcion || child.label}
                                      className="text-sm"
                                    >
                                      <NavLink to={child.path}>
                                        <ChildIcon className="h-3 w-3" />
                                        <span>{child.label}</span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
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