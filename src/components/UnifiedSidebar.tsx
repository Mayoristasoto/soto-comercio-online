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
  Briefcase,
  Package
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  History,
  Package
}

// Mapa de colores para cada icono
const iconColors: Record<string, string> = {
  Home: "text-blue-500",
  Award: "text-yellow-500",
  Trophy: "text-amber-500",
  Medal: "text-orange-500",
  Clock: "text-green-500",
  CheckSquare: "text-emerald-500",
  ClipboardCheck: "text-teal-500",
  Settings: "text-gray-500",
  Users: "text-purple-500",
  User: "text-violet-500",
  UserCheck: "text-indigo-500",
  BarChart3: "text-cyan-500",
  Calendar: "text-pink-500",
  Target: "text-red-500",
  Building2: "text-slate-500",
  FileText: "text-blue-400",
  FileSignature: "text-fuchsia-500",
  FileWarning: "text-orange-600",
  Plane: "text-sky-500",
  LayoutDashboard: "text-blue-500",
  ClipboardList: "text-teal-500",
  Gift: "text-yellow-500",
  DollarSign: "text-green-600",
  BookOpen: "text-indigo-500",
  Shield: "text-red-600",
  Briefcase: "text-slate-600",
  Tablet: "text-slate-500",
  Tv: "text-slate-500",
  Edit: "text-blue-400",
  AlertTriangle: "text-amber-600",
  History: "text-gray-600",
  Package: "text-orange-500"
}

const getIconColor = (iconName: string): string => {
  return "text-muted-foreground"
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
                                  className={`
                                    font-semibold text-base transition-colors my-1 rounded-md px-3 py-3
                                    border-l-4
                                    ${isCurrentPath || hasActiveChild 
                                      ? 'bg-primary/20 border-primary hover:bg-primary/25' 
                                      : 'bg-accent/60 border-transparent hover:bg-accent/80'
                                    }
                                  `}
                                >
                                  <Icon className={`h-5 w-5 shrink-0 ${isCurrentPath || hasActiveChild ? 'text-primary' : 'text-muted-foreground'}`} />
                                  <span>{link.nombre}</span>
                                  <ChevronDown 
                                    className={`ml-auto h-4 w-4 transition-transform duration-200 ${isCurrentPath || hasActiveChild ? 'text-primary' : 'text-muted-foreground'}`}
                                  />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            ) : (
                              <SidebarMenuButton 
                                asChild 
                                isActive={isCurrentPath}
                                tooltip={link.descripcion || link.nombre}
                                className={`
                                  transition-all duration-200 my-0.5 rounded-md
                                  ${isCurrentPath 
                                    ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm' 
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                  }
                                `}
                              >
                                <NavLink to={fixPath(link.path, link.nombre)} className="flex items-center gap-3 px-3 py-2">
                                  <Icon className={`h-4 w-4 shrink-0 ${isCurrentPath ? 'text-primary-foreground' : ''}`} />
                                  <span className="text-sm">{link.nombre}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            )}
                          </SidebarMenuItem>
                          
                          {/* Renderizar hijos si existen */}
                          {hasChildren && (
                            <CollapsibleContent>
                              <SidebarMenuSub className="ml-3 border-l border-border/50">
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
                                         <Collapsible key={child.id} open={open} onOpenChange={() => toggleExpanded(child.id)} className="group/collapsible">
                                          <SidebarMenuSubItem>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <CollapsibleTrigger asChild>
                                                  <SidebarMenuSubButton 
                                                    isActive={isChildActive}
                                                    className={`
                                                      transition-all duration-200 my-0.5 rounded-md pl-4
                                                      ${isChildActive || childHasActiveGrand
                                                        ? 'bg-primary/15 text-primary font-semibold hover:bg-primary/20' 
                                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                      }
                                                    `}
                                                  >
                                                    <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${isChildActive || childHasActiveGrand ? 'text-primary' : ''}`} />
                                                    <span className="text-xs truncate flex-1">{child.nombre}</span>
                                                    <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isChildActive || childHasActiveGrand ? 'text-primary' : ''}`} />
                                                  </SidebarMenuSubButton>
                                                </CollapsibleTrigger>
                                              </TooltipTrigger>
                                              <TooltipContent side="right">
                                                <p>{child.descripcion || child.nombre}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </SidebarMenuSubItem>
                                         <CollapsibleContent>
                                           <SidebarMenuSub className="ml-2 border-l border-border/50">
                                             {(child as any).children.map((grand: any) => {
                                               const GrandIcon = getIcon(grand.icon)
                                               const grandPath = fixPath(grand.path, grand.nombre)
                                               const isGrandActive = grandPath.includes('#')
                                                 ? currentFullPath === grandPath
                                                 : location.pathname === grandPath
                                               return (
                                                   <SidebarMenuSubItem key={grand.id}>
                                                     <Tooltip>
                                                       <TooltipTrigger asChild>
                                                         <SidebarMenuSubButton 
                                                           asChild 
                                                           isActive={isGrandActive}
                                                           className={`
                                                             transition-all duration-200 my-0.5 rounded-md pl-3
                                                             ${isGrandActive 
                                                               ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm' 
                                                               : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                             }
                                                           `}
                                                         >
                                                           <NavLink to={fixPath(grand.path, grand.nombre)} className="flex items-center gap-2">
                                                             <GrandIcon className={`h-3.5 w-3.5 shrink-0 ${isGrandActive ? 'text-primary-foreground' : ''}`} />
                                                             <span className="text-xs truncate">{grand.nombre}</span>
                                                           </NavLink>
                                                         </SidebarMenuSubButton>
                                                       </TooltipTrigger>
                                                       <TooltipContent side="right">
                                                         <p>{grand.descripcion || grand.nombre}</p>
                                                       </TooltipContent>
                                                     </Tooltip>
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
                                       <Tooltip>
                                         <TooltipTrigger asChild>
                                           <SidebarMenuSubButton 
                                             asChild 
                                             isActive={isChildActive}
                                             className={`
                                               transition-all duration-200 my-0.5 rounded-md pl-4
                                               ${isChildActive 
                                                 ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm' 
                                                 : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                               }
                                             `}
                                           >
                                             <NavLink to={fixPath(child.path, child.nombre)} className="flex items-center gap-2">
                                               <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${isChildActive ? 'text-primary-foreground' : ''}`} />
                                               <span className="text-xs truncate">{child.nombre}</span>
                                             </NavLink>
                                           </SidebarMenuSubButton>
                                         </TooltipTrigger>
                                         <TooltipContent side="right">
                                           <p>{child.descripcion || child.nombre}</p>
                                         </TooltipContent>
                                       </Tooltip>
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