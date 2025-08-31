import { useState, useEffect } from "react"
import { 
  Home, 
  Trophy, 
  Target, 
  Users, 
  Building2, 
  Award, 
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  User
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

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

// Items del menú para empleados
const empleadoItems = [
  { title: "Inicio", url: "/home", icon: Home },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Desafíos", url: "/desafios", icon: Target },
  { title: "Mi Perfil", url: "/perfil", icon: User },
]

// Items del menú para administradores
const adminItems = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Empleados", url: "/admin/empleados", icon: Users },
  { title: "Sucursales", url: "/admin/sucursales", icon: Building2 },
  { title: "Desafíos", url: "/admin/desafios", icon: Target },
  { title: "Premios", url: "/admin/premios", icon: Award },
  { title: "Reportes", url: "/admin/reportes", icon: BarChart3 },
  { title: "Configuración", url: "/admin/config", icon: Settings },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [empleado, setEmpleado] = useState<Empleado | null>(null)
  const [loading, setLoading] = useState(true)

  const currentPath = location.pathname

  useEffect(() => {
    loadEmpleado()
  }, [])

  const loadEmpleado = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/auth')
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
      
      navigate('/auth')
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

  // Determinar qué items mostrar según el rol
  const menuItems = empleado?.rol === 'admin_rrhh' ? adminItems : empleadoItems
  
  // Mantener grupo abierto si contiene la ruta activa
  const isExpanded = menuItems.some((i) => isActive(i.url))

  if (loading) {
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
          <h2 className="text-lg font-semibold text-primary">Soto Reconoce</h2>
          {empleado && (
            <div className="text-sm text-muted-foreground">
              {empleado.sucursal?.nombre}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {empleado?.rol === 'admin_rrhh' ? 'Administración' : 'Menú Principal'}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
              <p className="text-sm font-medium truncate">
                {empleado.nombre} {empleado.apellido}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {empleado.rol.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="mt-2 w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}