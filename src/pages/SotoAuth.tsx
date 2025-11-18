import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Building2, Award } from "lucide-react"
import FacialRecognitionAuth from "@/components/FacialRecognitionAuth"

export default function SotoAuth() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error && error.message.includes('refresh_token_not_found')) {
        await supabase.auth.signOut()
        return
      }
      if (user) {
        navigate('/reconoce/home')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      await supabase.auth.signOut()
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔐 [SotoAuth.tsx] Iniciando proceso de login...');
    console.log('📧 Email ingresado:', email);
    console.log('🔑 Password presente:', !!password, 'Length:', password?.length || 0);

    if (!email || !password) {
      console.warn('⚠️ [SotoAuth.tsx] Faltan campos requeridos');
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log('⏳ [SotoAuth.tsx] Llamando a supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('📥 [SotoAuth.tsx] Respuesta de Supabase:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error 
      });

      if (error) {
        console.error('❌ [SotoAuth.tsx] Error de autenticación:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        });

        // Registrar intento fallido
        try {
          await supabase.rpc('registrar_intento_login_v2', {
            p_email: email,
            p_evento: 'login_fallido',
            p_metodo: 'email_password',
            p_exitoso: false,
            p_mensaje_error: error.message
          });
        } catch (logError) {
          console.error('Error registrando log:', logError);
        }

        throw error
      }

      console.log('✅ [SotoAuth.tsx] Login exitoso!', {
        userId: data?.user?.id,
        email: data?.user?.email
      });

      // Registrar login exitoso
      try {
        await supabase.rpc('registrar_intento_login_v2', {
          p_email: email,
          p_evento: 'login_exitoso',
          p_metodo: 'email_password',
          p_exitoso: true,
          p_user_id: data?.user?.id
        });
      } catch (logError) {
        console.error('Error registrando log:', logError);
      }

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente"
      })
      
      navigate('/dashboard')
    } catch (error: any) {
      console.error('💥 [SotoAuth.tsx] Error inesperado en signIn:', error)
      toast({
        title: "Error de autenticación",
        description: error.message === "Invalid login credentials" 
          ? "Email o contraseña incorrectos" 
          : error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFacialLogin = async (user: { nombre: string, apellido: string, email: string }) => {
    // Handle successful facial login with user info
    toast({
      title: "¡Acceso autorizado!",
      description: `Bienvenido, ${user.nombre} ${user.apellido}`
    })
    navigate('/reconoce/home')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <Award className="h-8 w-8 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Soto Reconoce</h1>
            <p className="text-muted-foreground mt-2">
              Plataforma de incentivos y reconocimientos
            </p>
          </div>
        </div>

        {/* Auth Tabs */}
        <Card>
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
                  <CardDescription>
                    Ingresa con tu email y contraseña o usa reconocimiento facial
                  </CardDescription>
                </div>

                <Tabs defaultValue="email-login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email-login">Email</TabsTrigger>
                    <TabsTrigger value="facial-login">Reconocimiento</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="email-login" className="mt-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="facial-login" className="mt-4">
                    <FacialRecognitionAuth
                      mode="login"
                      onRegisterSuccess={() => {}}
                      onLoginSuccess={handleFacialLogin}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Demo info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Nota:</strong> El registro de nuevos usuarios debe realizarse a través del panel de administración.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}