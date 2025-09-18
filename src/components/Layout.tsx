import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{
    nombre: string
    apellido: string
    email: string
    rol: string
  } | null>(null)

  useEffect(() => {
    checkAuth()
    
    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/reconoce/auth')
        } else if (event === 'SIGNED_IN' && location.pathname === '/reconoce/auth') {
          navigate('/reconoce/home')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate, location.pathname])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/reconoce/auth')
        return
      }

      // Verificar que el empleado existe en la base de datos
      const { data: empleado, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, email, rol')
        .eq('user_id', user.id)
        .single()

      if (error || !empleado) {
        console.error('Error cargando empleado:', error)
        toast({
          title: "Error",
          description: "Tu perfil de empleado no está configurado correctamente",
          variant: "destructive"
        })
        await supabase.auth.signOut()
        navigate('/reconoce/auth')
        return
      }

      // Guardar información del usuario
      setUserInfo({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email: empleado.email,
        rol: empleado.rol
      })

    } catch (error) {
      console.error('Error verificando autenticación:', error)
      navigate('/reconoce/auth')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header con trigger del sidebar */}
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
                    {userInfo.rol === 'admin_rrhh' ? 'Admin' : 
                     userInfo.rol === 'gerente_sucursal' ? 'Gerente' : 
                     userInfo.rol === 'lider_grupo' ? 'Líder' : 'Empleado'}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    navigate('/reconoce/auth')
                  }}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Salir
                </Button>
              </div>
            )}
          </header>

          {/* Contenido principal */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}