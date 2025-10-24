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
  FileWarning,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  AlertTriangle,
  History,
  Shield,
  Briefcase
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSidebarLinks } from "@/hooks/useSidebarLinks"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useTheme } from "next-themes"

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
  User, ClipboardCheck, Plane, FileSignature, FileWarning,
  LayoutDashboard: Home,
  ClipboardList: ClipboardCheck,
  Gift: Award,
  DollarSign: FileText,
  BookOpen: FileText,
  Shield,
  Briefcase: Building2,
  Tablet: Building2,
  Tv: Building2,
  Edit: FileText,
  Medal: Award,
  AlertTriangle,
  History
}

export function UnifiedSidebar({ userInfo }: UnifiedSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { links, loading } = useSidebarLinks(userInfo?.rol || null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const currentFullPath = `${location.pathname}${location.hash || ''}`
  
  const isActive = (path: string) => {
    // Si el path tiene un hash, comparar incluyendo el hash
    if (path.includes('#')) {
      return currentFullPath === path
    }
    // Si no tiene hash, comparar solo el pathname
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

  // Normaliza rutas mal configuradas desde la BD
  const fixPath = (path: string, name?: string) => {
    if (!path) return path
    let p = path

    // Correcciones específicas conocidas
    if (p.includes('anotaciones3') || p === '/reconoce/admin') {
      p = '/rrhh/anotaciones'
    }

    // Si el nombre sugiere "Anotaciones" pero la ruta no coincide, corrige
    if (name && name.toLowerCase().includes('anotacion') && !p.includes('/anotaciones')) {
      p = '/rrhh/anotaciones'
    }

    return p
  }

  const toggleExpanded = (linkId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(linkId)) {
        newSet.delete(linkId)
      } else {
        newSet.add(linkId)
      }
      return newSet
    })
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success("Sesión cerrada correctamente")
      navigate("/auth")
    } catch (error: any) {
      toast.error("Error al cerrar sesión: " + error.message)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
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
                            {link.nombre && (
                              <p className="text-xs text-muted-foreground mt-2 px-2 font-medium">
                                {link.nombre}
                              </p>
                            )}
                          </div>
                        )
                      }

                      // Renderizar link normal
                      const Icon = getIcon(link.icon)
                      const hasChildren = link.children && link.children.length > 0
                      
                      // Comparar con el path completo incluyendo hash si el link tiene hash
                      const linkPath = fixPath(link.path, link.nombre)
                      const isCurrentPath = linkPath.includes('#') 
                        ? currentFullPath === linkPath 
                        : isActive(linkPath)
                      
                      // Auto-expandir si algún hijo está activo
                      const hasActiveChild = hasChildren && link.children.some((child: any) => {
                        const childPath = fixPath(child.path, child.nombre)
                        return childPath.includes('#') 
                          ? currentFullPath === childPath 
                          : location.pathname === childPath
                      })
                      const shouldBeExpanded = expandedItems.has(link.id) || hasActiveChild
                      
                      return (
                        <Collapsible
                          key={link.id}
                          open={shouldBeExpanded}
                          onOpenChange={() => toggleExpanded(link.id)}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            {hasChildren ? (
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton 
                                  tooltip={link.descripcion || link.nombre}
                                  isActive={isCurrentPath || hasActiveChild}
                                  className="font-bold text-primary text-base hover:bg-accent/50"
                                >
                                  <Icon className="h-5 w-5" />
                                  <span>{link.nombre}</span>
                                  <ChevronDown 
                                    className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180"
                                  />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            ) : (
                              <SidebarMenuButton 
                                asChild 
                                isActive={isCurrentPath}
                                tooltip={link.descripcion || link.nombre}
                              >
                                <NavLink to={fixPath(link.path, link.nombre)}>
                                  <Icon className="h-4 w-4" />
                                  <span>{link.nombre}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            )}
                          </SidebarMenuItem>
                          
                          {/* Renderizar hijos si existen */}
                          {hasChildren && (
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {link.children.map((child) => {
                                   const ChildIcon = getIcon(child.icon)
                                   const childPath = fixPath(child.path, child.nombre)
                                   const isChildActive = childPath.includes('#')
                                     ? currentFullPath === childPath
                                     : location.pathname === childPath
                                   const childHasChildren = (child as any).children && (child as any).children.length > 0
                                   const childHasActiveGrand = childHasChildren && (child as any).children.some((g: any) => {
                                     const grandPath = fixPath(g.path, g.nombre)
                                     return grandPath.includes('#')
                                       ? currentFullPath === grandPath
                                       : location.pathname === grandPath
                                   })

                                  if (childHasChildren) {
                                    const open = expandedItems.has(child.id) || isChildActive || childHasActiveGrand
                                    return (
                                      <Collapsible key={child.id} open={open} onOpenChange={() => toggleExpanded(child.id)}>
                                        <SidebarMenuSubItem>
                                          <CollapsibleTrigger asChild>
                                            <SidebarMenuSubButton isActive={isChildActive}>
                                              <ChildIcon className="h-4 w-4" />
                                              <span>{child.nombre}</span>
                                              <ChevronDown className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                                            </SidebarMenuSubButton>
                                          </CollapsibleTrigger>
                                        </SidebarMenuSubItem>
                                        <CollapsibleContent>
                                          <SidebarMenuSub>
                                             {(child as any).children.map((grand: any) => {
                                               const GrandIcon = getIcon(grand.icon)
                                               const grandPath = fixPath(grand.path, grand.nombre)
                                               const isGrandActive = grandPath.includes('#')
                                                 ? currentFullPath === grandPath
                                                 : location.pathname === grandPath
                                              return (
                                                <SidebarMenuSubItem key={grand.id}>
                                                  <SidebarMenuSubButton asChild isActive={isGrandActive}>
                                                    <NavLink to={fixPath(grand.path, grand.nombre)}>
                                                      <GrandIcon className="h-4 w-4" />
                                                      <span>{grand.nombre}</span>
                                                    </NavLink>
                                                  </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                              )
                                            })}
                                          </SidebarMenuSub>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    )
                                  }

                                  return (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton 
                                        asChild 
                                        isActive={isChildActive}
                                      >
                                        <NavLink to={fixPath(child.path, child.nombre)}>
                                          <ChildIcon className="h-4 w-4" />
                                          <span>{child.nombre}</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          )}
                        </Collapsible>
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
          <div className="p-3 border-t space-y-3">
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleTheme}
                className="flex-1"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Modo Oscuro
                  </>
                )}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleLogout}
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}