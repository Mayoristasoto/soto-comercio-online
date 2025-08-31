import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    
    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/auth')
        } else if (event === 'SIGNED_IN' && location.pathname === '/auth') {
          navigate('/home')
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
        .select('id')
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
        navigate('/auth')
        return
      }

    } catch (error) {
      console.error('Error verificando autenticación:', error)
      navigate('/auth')
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