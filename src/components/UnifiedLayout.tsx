import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UnifiedSidebar } from "@/components/UnifiedSidebar"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnifiedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{
    id: string
    nombre: string
    apellido: string
    email: string
    rol: string
    sucursal_id: string
    grupo_id?: string
    avatar_url?: string
  } | null>(null)

  useEffect(() => {
    checkAuth()
    
    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/auth')
        } else if (event === 'SIGNED_IN' && location.pathname === '/auth') {
          // La redirección se maneja en checkAuth() basada en el rol
          checkAuth()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate, location.pathname])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/auth')
        return
      }

      // Verificar que el empleado existe en la base de datos
      const { data: empleado, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, email, rol, sucursal_id, grupo_id, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error cargando empleado:', error)
        toast({
          title: "Error",
          description: "Error al cargar tu perfil de empleado",
          variant: "destructive"
        })
        await supabase.auth.signOut()
        navigate('/auth')
        return
      }

      if (!empleado) {
        console.log('No se encontró empleado para el usuario:', user.id)
        toast({
          title: "Error",
          description: "Tu perfil de empleado no está configurado. Contacta al administrador.",
          variant: "destructive"
        })
        await supabase.auth.signOut()
        navigate('/auth')
        return
      }

      // Guardar información del usuario
      setUserInfo({
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email: empleado.email,
        rol: empleado.rol,
        sucursal_id: empleado.sucursal_id,
        grupo_id: empleado.grupo_id,
        avatar_url: empleado.avatar_url
      })

      // Redirección y control de acceso basado en rol
      if (empleado.rol === 'empleado' || empleado.rol === 'gerente_sucursal') {
        // Empleados y gerentes son redirigidos a su dashboard personal
        const allowedPaths = ['/mi-dashboard', '/reconoce/premios']
        const currentPath = location.pathname
        
        // Gerentes tienen acceso a más rutas además del dashboard
        const isGerente = empleado.rol === 'gerente_sucursal'
        const adminRoutes = ['/reconoce', '/fichero', '/tareas', '/evaluaciones', '/vacaciones', '/solicitudes', '/anotaciones']
        const hasAdminAccess = isGerente && adminRoutes.some(route => currentPath.startsWith(route))

        console.debug('Auth redirect check', { rol: empleado.rol, currentPath, isGerente, hasAdminAccess })
        
        if (!allowedPaths.includes(currentPath) && !hasAdminAccess) {
          navigate('/mi-dashboard')
        }
      }

    } catch (error) {
      console.error('Error verificando autenticación:', error)
      navigate('/auth')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/auth')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <UnifiedSidebar userInfo={userInfo} />
        
        <div className="flex-1 flex flex-col">
          {/* Header unificado */}
          <header className="h-16 border-b bg-background flex items-center px-6">
            <SidebarTrigger />
            <div className="flex-1" />
            
            {/* Información del usuario */}
            {userInfo && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {userInfo.nombre} {userInfo.apellido}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {userInfo.rol === 'admin_rrhh' ? 'Admin RRHH' : 
                     userInfo.rol === 'gerente_sucursal' ? 'Gerente' : 
                     userInfo.rol === 'lider_grupo' ? 'Líder' : 'Empleado'}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Salir
                </Button>
              </div>
            )}
          </header>

          {/* Contenido principal */}
          <main className="flex-1 overflow-auto">
            <Outlet context={{ userInfo }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}