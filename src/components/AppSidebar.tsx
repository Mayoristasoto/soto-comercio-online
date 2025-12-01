import { useState, useEffect } from "react"
import { 
  LogOut,
  FileText
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import * as LucideIcons from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useSidebarLinks } from "@/hooks/useSidebarLinks"

// Tipos para empleados
type UserRole = 'admin_rrhh' | 'gerente_sucursal' | 'lider_grupo' | 'empleado'

interface Empleado {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: UserRole
  avatar_url?: string
  sucursal?: {
    nombre: string
  }
  grupo?: {
    nombre: string
  }
}

// Helper para obtener iconos dinámicamente
const getIcon = (iconName: string) => {
  const IconComponent = (LucideIcons as any)[iconName]
  return IconComponent || FileText
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)
  const { links, loading: linksLoading } = useSidebarLinks(empleado?.rol || null)

  const currentPath = location.pathname

  useEffect(() => {
    loadEmpleado()
  }, [])

  const loadEmpleado = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/reconoce/auth')
        return
      }

      const { data, error } = await supabase
        .from('empleados')
        .select(`
          *,
          sucursal:sucursales(nombre),
          grupo:grupos(nombre)
        `)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setEmpleado(data)
    } catch (error) {
      console.error('Error cargando empleado:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del usuario",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      navigate('/reconoce/auth')
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente"
      })
    } catch (error) {
      console.error('Error cerrando sesión:', error)
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive"
      })
    }
  }

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50"

  // Agrupar links por parent_id
  const parentLinks = links.filter(link => !link.parent_id)
  const childLinksByParent = links.reduce((acc, link) => {
    if (link.parent_id) {
      if (!acc[link.parent_id]) acc[link.parent_id] = []
      acc[link.parent_id].push(link)
    }
    return acc
  }, {} as Record<string, typeof links>)

  if (loading || linksLoading) {
    return (
      <Sidebar className="w-60">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar className="w-60">
      <SidebarHeader className="border-b p-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-black">Soto Reconoce</h2>
          {empleado && (
            <div className="text-sm text-black">
              {empleado.sucursal?.nombre}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {parentLinks.map((parentLink) => {
          const Icon = getIcon(parentLink.icon)
          const children = childLinksByParent[parentLink.id] || []
          
          return (
            <SidebarGroup key={parentLink.id}>
              <SidebarGroupLabel 
                className="
                  font-semibold text-base transition-colors my-1 rounded-md px-3 py-3
                  border-l-4 bg-accent/60 border-transparent hover:bg-accent/80
                "
              >
                {parentLink.nombre}
              </SidebarGroupLabel>
              <SidebarGroupContent className="pl-2">
                <SidebarMenu>
                  {children.map((link) => {
                    const ChildIcon = getIcon(link.icon)
                    const active = isActive(link.path)
                    return (
                      <SidebarMenuItem key={link.id}>
                        <SidebarMenuButton 
                          asChild
                          className={`
                            transition-all duration-200 my-0.5 rounded-md
                            ${active 
                              ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm' 
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }
                          `}
                        >
                          <NavLink to={link.path} end className="flex items-center gap-3 px-3 py-2">
                            <ChildIcon className={`h-4 w-4 shrink-0 ${active ? 'text-primary-foreground' : ''}`} />
                            <span className="text-sm">{link.nombre}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {empleado && (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={empleado.avatar_url} />
              <AvatarFallback>
                {empleado.nombre[0]}{empleado.apellido[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-black">
                {empleado.nombre} {empleado.apellido}
              </p>
              <p className="text-xs text-black capitalize">
                {empleado.rol.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="mt-2 w-full justify-start text-black hover:text-black"
        >
          <LogOut className="h-4 w-4 mr-2 text-black" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}