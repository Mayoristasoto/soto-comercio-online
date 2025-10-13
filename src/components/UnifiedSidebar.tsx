import { useMemo } from "react"
import * as Icons from "lucide-react"
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

export function UnifiedSidebar({ userInfo }: UnifiedSidebarProps) {
  const location = useLocation()
  const { links, loading } = useSidebarLinks(userInfo?.rol || null)
  
  // Helper para obtener el ícono dinámicamente
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName]
    return IconComponent || Icons.Circle
  }

  // Agrupar links por parent_id
  const { parentLinks, childrenByParent } = useMemo(() => {
    const parents = links.filter(link => !link.parent_id)
    const childMap: Record<string, typeof links> = {}
    
    links.forEach(link => {
      if (link.parent_id) {
        if (!childMap[link.parent_id]) {
          childMap[link.parent_id] = []
        }
        childMap[link.parent_id].push(link)
      }
    })
    
    return { parentLinks: parents, childrenByParent: childMap }
  }, [links])

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

  if (loading) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Sidebar>
    )
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
        {/* Renderizar links principales y sus hijos dinámicamente */}
        {parentLinks.map((parentLink) => {
          const Icon = getIcon(parentLink.icon)
          const children = childrenByParent[parentLink.id] || []
          const hasChildren = children.length > 0

          return (
            <SidebarGroup key={parentLink.id}>
              {hasChildren ? (
                // Si tiene hijos, mostrar como grupo con label
                <>
                  <SidebarGroupLabel>{parentLink.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {children.map((childLink) => {
                        const ChildIcon = getIcon(childLink.icon)
                        return (
                          <SidebarMenuItem key={childLink.id}>
                            <SidebarMenuButton 
                              asChild 
                              isActive={isActive(childLink.path)}
                              tooltip={childLink.descripcion || childLink.label}
                            >
                              <NavLink to={childLink.path}>
                                <ChildIcon className="h-4 w-4" />
                                <span>{childLink.label}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </>
              ) : (
                // Si no tiene hijos, mostrar como item individual
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(parentLink.path)}
                        tooltip={parentLink.descripcion || parentLink.label}
                      >
                        <NavLink to={parentLink.path}>
                          <Icon className="h-4 w-4" />
                          <span>{parentLink.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          )
        })}
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