import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UnifiedSidebar } from "@/components/UnifiedSidebar"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { User, LogOut, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlobalSearch } from "@/components/GlobalSearch"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { NotificationCenter, useNotifications } from "@/components/ui/notification-center"
import { ShortcutsHelp, useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { ThemeSwitcher } from "@/components/ui/theme-switcher"
import { ForcedPasswordChange } from "@/components/employee/ForcedPasswordChange"
import { useEncargadoAccesos } from "@/hooks/useEncargadoAccesos"
import { ArrowLeft } from "lucide-react"

export default function UnifiedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [debeCambiarPassword, setDebeCambiarPassword] = useState(false)
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

  const isGerenteUser = userInfo?.rol === 'gerente_sucursal'
  const { accesos, loading: loadingAccesos } = useEncargadoAccesos()

  // Los gerentes solo pueden navegar a los destinos de las tarjetas de su panel
  useEffect(() => {
    if (!isGerenteUser || loadingAccesos) return
    const permitidas = [
      '/preview-panel-encargado',
      ...accesos.filter(a => a.activo).map(a => a.url.split('#')[0].split('?')[0]),
    ]
    const path = location.pathname
    const permitido = permitidas.some(r => path === r || path.startsWith(r + '/'))
    if (!permitido) {
      navigate('/preview-panel-encargado', { replace: true })
    }
  }, [isGerenteUser, loadingAccesos, accesos, location.pathname, navigate])


  // Notificaciones
  const {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clear,
    clearAll,
  } = useNotifications();

  // Atajos de teclado globales
  useKeyboardShortcuts([
    {
      key: "h",
      ctrl: true,
      action: () => navigate("/"),
      description: "Ir al inicio",
      category: "Navegación",
    },
    {
      key: "d",
      ctrl: true,
      action: () => navigate("/dashboard"),
      description: "Ir al dashboard",
      category: "Navegación",
    },
    {
      key: "n",
      ctrl: true,
      action: () => navigate("/rrhh/nomina"),
      description: "Ir a nómina",
      category: "RRHH",
    },
  ]);

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
        .select('id, nombre, apellido, email, rol, sucursal_id, grupo_id, avatar_url, debe_cambiar_password')
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
      setDebeCambiarPassword(empleado.debe_cambiar_password || false)

      // Gerentes: acceso restringido a las tarjetas de su panel (manejado en efecto aparte)
      if (empleado.rol === 'gerente_sucursal') {
        // no-op aquí
      } else if (empleado.rol === 'empleado') {
        const currentPath = location.pathname

        const empleadoRoutes = [
          '/mi-dashboard',
          '/reconoce/premios',
          '/rrhh/vacaciones',
          '/vacaciones', // redirect legacy
          '/rrhh/solicitudes',
          '/solicitudes', // redirect legacy
          '/operaciones/tareas',
          '/tareas', // redirect legacy
          '/operaciones/fichero',
          '/fichero', // redirect legacy
          '/reconoce',
          '/ranking',
          '/desafios',
          '/insignias',
          '/premios'
        ]

        const hasAccess = empleadoRoutes.some(route => currentPath.startsWith(route))

        if (!hasAccess) {
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

  // Para gerentes de sucursal en primer acceso: forzar cambio de contraseña
  // sin mostrar sidebar, solo el recuadro del formulario
  if (userInfo?.rol === 'gerente_sucursal' && debeCambiarPassword) {
    return (
      <ForcedPasswordChange
        empleadoId={userInfo.id}
        empleadoEmail={userInfo.email}
        onPasswordChanged={() => navigate('/preview-panel-encargado')}
        standalone
      />
    )
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <UnifiedSidebar userInfo={userInfo} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header unificado - Responsive */}
          <header className="sticky top-0 z-40 h-14 md:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-3 md:px-6 gap-2 md:gap-4">
            <SidebarTrigger className="shrink-0" />
            
            {/* Búsqueda Global - Oculta en móvil muy pequeño */}
            <div className="flex-1 min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full max-w-sm justify-start text-muted-foreground h-9 md:h-10"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    ctrlKey: true,
                    bubbles: true
                  })
                  document.dispatchEvent(event)
                }}
              >
                <Search className="h-4 w-4 mr-2 shrink-0" />
                <span className="hidden sm:inline text-sm">Buscar...</span>
                <span className="sm:hidden text-sm">Buscar</span>
                <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
            
            {/* Notificaciones, tema y ayuda */}
            <div className="flex items-center gap-1 shrink-0">
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClear={clear}
                onClearAll={clearAll}
              />
              <ThemeSwitcher />
              <ShortcutsHelp
                shortcuts={[
                  {
                    key: "k",
                    ctrl: true,
                    action: () => {},
                    description: "Búsqueda global",
                    category: "General",
                  },
                  {
                    key: "h",
                    ctrl: true,
                    action: () => {},
                    description: "Ir al inicio",
                    category: "Navegación",
                  },
                  {
                    key: "d",
                    ctrl: true,
                    action: () => {},
                    description: "Ir al dashboard",
                    category: "Navegación",
                  },
                  {
                    key: "?",
                    shift: true,
                    action: () => {},
                    description: "Mostrar atajos",
                    category: "General",
                  },
                ]}
              />
            </div>
            
            {/* Información del usuario - Adaptativa */}
            {userInfo && (
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {/* Desktop: Nombre completo + Badge */}
                <div className="hidden lg:flex items-center gap-2">
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
                
                {/* Tablet: Solo badge */}
                <div className="hidden md:flex lg:hidden">
                  <Badge variant="secondary" className="text-xs">
                    {userInfo.rol === 'admin_rrhh' ? 'Admin' : 
                     userInfo.rol === 'gerente_sucursal' ? 'Gerente' : 
                     userInfo.rol === 'lider_grupo' ? 'Líder' : 'Empleado'}
                  </Badge>
                </div>
                
                {/* Botón logout - Adaptativo */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="h-9"
                >
                  <LogOut className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline text-sm">Salir</span>
                </Button>
              </div>
            )}
          </header>

          {/* Global Search Dialog */}
          <GlobalSearch userRole={userInfo?.rol} />

          {/* Contenido principal - Responsive */}
          <main className="flex-1 overflow-auto bg-muted/30">
            <div className="py-4 md:py-6">
              <Breadcrumbs />
              <Outlet context={{ userInfo }} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}