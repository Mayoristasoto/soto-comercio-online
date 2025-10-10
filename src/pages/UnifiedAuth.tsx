import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Mail, Lock, User, Building, Scan } from "lucide-react"
import FacialRecognitionAuth from "@/components/FacialRecognitionAuth"

export default function UnifiedAuth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Obtener el módulo de destino de los parámetros de URL
  const redirectTo = searchParams.get('redirect') || '/reconoce'

  useEffect(() => {
    // Verificar si ya está autenticado
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error && error.message.includes('refresh_token_not_found')) {
          await supabase.auth.signOut()
          return
        }
        if (user) {
          navigate(redirectTo)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        await supabase.auth.signOut()
      }
    }
    
    checkAuth()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate(redirectTo)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate, redirectTo])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: "Error de autenticación",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data.user) {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente",
        })
        navigate(redirectTo)
      }
    } catch (error) {
      console.error('Error en login:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
          data: {
            nombre,
            apellido,
          }
        }
      })

      if (error) {
        toast({
          title: "Error en registro",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data.user) {
        toast({
          title: "Cuenta creada",
          description: "Revisa tu email para confirmar tu cuenta",
        })
      }
    } catch (error) {
      console.error('Error en registro:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFacialLogin = async (user: { nombre: string, apellido: string, email: string }) => {
    try {
      console.log('UnifiedAuth: Iniciando autenticación facial para:', user.email)
      
      // Verificar que el empleado existe y obtener su user_id
      const { data: empleado, error: empleadoError } = await supabase
        .from('empleados')
        .select('user_id, id')
        .eq('email', user.email)
        .maybeSingle()

      if (empleadoError) {
        console.error('UnifiedAuth: Error buscando empleado:', empleadoError)
        toast({
          title: "Error",
          description: "Error al verificar usuario",
          variant: "destructive",
        })
        return
      }

      if (!empleado || !empleado.user_id) {
        console.error('UnifiedAuth: Empleado no encontrado o sin user_id:', empleado)
        toast({
          title: "Error",
          description: "Usuario no tiene cuenta asociada. Contacte con administración.",
          variant: "destructive",
        })
        return
      }

      console.log('UnifiedAuth: Empleado encontrado, creando sesión para user_id:', empleado.user_id)

      // Llamar al edge function para crear una sesión autenticada
      const { data: authData, error: authError } = await supabase.functions.invoke(
        'facial-auth-login',
        {
          body: { user_id: empleado.user_id }
        }
      )

      if (authError || !authData?.session) {
        console.error('UnifiedAuth: Error creando sesión:', authError)
        toast({
          title: "Error",
          description: "No se pudo crear la sesión de autenticación",
          variant: "destructive",
        })
        return
      }

      console.log('UnifiedAuth: Sesión creada exitosamente, estableciendo en cliente')

      // Establecer la sesión en el cliente
      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      })

      toast({
        title: "Bienvenido",
        description: `¡Hola ${user.nombre} ${user.apellido}!`,
      })
      
      // La redirección será manejada automáticamente por el listener de auth
    } catch (error) {
      console.error("UnifiedAuth: Error in facial login:", error)
      toast({
        title: "Error",
        description: "Error durante el inicio de sesión facial",
        variant: "destructive",
      })
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/unifiedauth`,
      })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Email enviado",
          description: "Revisa tu email para restablecer tu contraseña",
        })
        setShowResetPassword(false)
        setResetEmail("")
      }
    } catch (error) {
      console.error("Error in password reset:", error)
      toast({
        title: "Error",
        description: "Error al enviar email de recuperación",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <img 
              src="/lovable-uploads/4070ebac-75fa-40a1-a6a6-59de784f9cb2.png" 
              alt="Soto Logo" 
              className="h-12 w-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Sistema Soto</CardTitle>
            <CardDescription>
              Acceso unificado a todos los módulos empresariales
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Email</TabsTrigger>
              <TabsTrigger value="facial">
                <Scan className="h-4 w-4 mr-1" />
                Facial
              </TabsTrigger>
              <TabsTrigger value="signup">Registro</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              {showResetPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="tu@empresa.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Enviando..." : "Enviar Email de Recuperación"}
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost"
                      className="w-full" 
                      onClick={() => setShowResetPassword(false)}
                      disabled={isLoading}
                    >
                      Volver
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-xs"
                    onClick={() => setShowResetPassword(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
              )}
            </TabsContent>

            <TabsContent value="facial">
              <FacialRecognitionAuth
                mode="login"
                onRegisterSuccess={() => {}}
                onLoginSuccess={handleFacialLogin}
              />
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nombre">Nombre</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-nombre"
                        type="text"
                        placeholder="Juan"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-apellido">Apellido</Label>
                    <Input
                      id="signup-apellido"
                      type="text"
                      placeholder="Pérez"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Información de módulos */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Módulos disponibles:
            </h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="h-3 w-3" />
                <span><strong>Reconocimiento:</strong> Premios y reconocimientos</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-3 w-3" />
                <span><strong>Control Horario:</strong> Fichado facial</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-3 w-3" />
                <span><strong>Tareas:</strong> Gestión de actividades</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}