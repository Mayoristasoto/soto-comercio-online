import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Mail, Lock, User, Building, Scan, KeyRound } from "lucide-react"
import FacialRecognitionAuth from "@/components/FacialRecognitionAuth"
import PinLoginAuth from "@/components/auth/PinLoginAuth"

export default function UnifiedAuth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Obtener el módulo de destino de los parámetros de URL
  const redirectTo = searchParams.get('redirect') || '/dashboard'

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

    console.log('🔐 [UnifiedAuth.tsx] Iniciando proceso de login...');
    console.log('📧 Email ingresado:', email);
    console.log('🔑 Password presente:', !!password, 'Length:', password?.length || 0);
    console.log('🎯 Redirect destino:', redirectTo);

    try {
      console.log('⏳ [UnifiedAuth.tsx] Llamando a supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('📥 [UnifiedAuth.tsx] Respuesta de Supabase:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error 
      });

      if (error) {
        console.error('❌ [UnifiedAuth.tsx] Error de autenticación:', error.message);

        // Si falla y el password parece un PIN (4 dígitos), intentar flujo PIN
        if (error.message === 'Invalid login credentials' && /^\d{4}$/.test(password)) {
          console.log('🔄 [UnifiedAuth.tsx] Intentando fallback con PIN...');
          try {
            const { data: emp } = await supabase
              .from('empleados')
              .select('id, rol')
              .eq('email', email.toLowerCase().trim())
              .eq('activo', true)
              .single();

            if (emp && emp.rol !== 'admin_rrhh') {
              const { data: pinData, error: pinError } = await supabase.functions.invoke('pin-first-login', {
                body: { empleado_id: emp.id, pin: password }
              });

              if (!pinError && pinData?.success && pinData?.email_otp) {
                console.log('✅ [UnifiedAuth.tsx] PIN válido, verificando OTP...');
                const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                  email: pinData.email || email,
                  token: pinData.email_otp,
                  type: 'email',
                });

                if (!verifyError && verifyData?.session) {
                  try {
                    await supabase.rpc('registrar_intento_login_v2', {
                      p_email: email,
                      p_evento: 'login_exitoso',
                      p_metodo: 'pin_via_email',
                      p_exitoso: true,
                      p_user_id: verifyData.user?.id
                    });
                  } catch (logErr) { console.warn('Log error:', logErr); }

                  toast({
                    title: "Bienvenido",
                    description: "Primer acceso exitoso. Deberás cambiar tu contraseña.",
                  });
                  navigate(redirectTo);
                  return;
                }
              }
            }
          } catch (pinFallbackErr) {
            console.error('❌ [UnifiedAuth.tsx] Error en fallback PIN:', pinFallbackErr);
          }
        }

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

        toast({
          title: "Error de autenticación",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data.user) {
        console.log('✅ [UnifiedAuth.tsx] Login exitoso!', {
          userId: data.user.id,
          email: data.user.email
        });

        // Registrar login exitoso
        try {
          await supabase.rpc('registrar_intento_login_v2', {
            p_email: email,
            p_evento: 'login_exitoso',
            p_metodo: 'email_password',
            p_exitoso: true,
            p_user_id: data.user.id
          });
        } catch (logError) {
          console.error('Error registrando log de autenticación:', logError);
        }

        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente",
        })
        navigate(redirectTo)
      }
    } catch (error) {
      console.error('💥 [UnifiedAuth.tsx] Error inesperado en login:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFacialLogin = async (user: { nombre: string, apellido: string, email: string, user_id?: string }) => {
    try {
      console.log('UnifiedAuth: Iniciando autenticación facial para:', user.email, 'user_id:', user.user_id)
      
      // El user_id ahora viene directamente del reconocimiento facial
      if (!user.user_id) {
        // Log de intento facial sin cuenta asociada
        try {
          await supabase.rpc('registrar_intento_login_v2', {
            p_email: user.email,
            p_evento: 'intento_facial',
            p_metodo: 'facial',
            p_exitoso: false,
            p_mensaje_error: 'usuario_sin_cuenta_asociada'
          });
        } catch (logErr) {
          console.warn('No se pudo registrar intento facial sin cuenta:', logErr)
        }

        console.error('UnifiedAuth: Usuario reconocido pero sin user_id asociado')
        toast({
          title: "Error",
          description: "Usuario no tiene cuenta asociada. Contacte con administración.",
          variant: "destructive",
        })
        return
      }

      console.log('UnifiedAuth: Creando sesión para user_id:', user.user_id)

      // Llamar al edge function para obtener OTP y crear sesión en el cliente
      const { data: authData, error: authError } = await supabase.functions.invoke(
        'facial-auth-login',
        {
          body: { user_id: user.user_id }
        }
      )

      if (authError || !authData?.email_otp) {
        // Log de intento facial fallido (no se obtuvo OTP)
        try {
          await supabase.rpc('registrar_intento_login_v2', {
            p_email: user.email,
            p_evento: 'intento_facial',
            p_metodo: 'facial',
            p_exitoso: false,
            p_mensaje_error: authError?.message || 'no_se_pudo_obtener_otp'
          });
        } catch (logErr) {
          console.warn('No se pudo registrar intento facial fallido (OTP):', logErr)
        }

        console.error('UnifiedAuth: Error obteniendo OTP:', authError)
        toast({
          title: "Error",
          description: "No se pudo obtener el token de autenticación",
          variant: "destructive",
        })
        return
      }

      console.log('UnifiedAuth: Verificando OTP para crear sesión')

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: authData.email || user.email,
        token: authData.email_otp,
        type: 'email',
      })

      if (verifyError || !verifyData?.session) {
        // Log de login facial fallido en verificación OTP
        try {
          await supabase.rpc('registrar_intento_login_v2', {
            p_email: user.email,
            p_evento: 'login_fallido',
            p_metodo: 'facial',
            p_exitoso: false,
            p_mensaje_error: verifyError?.message || 'otp_invalido'
          });
        } catch (logErr) {
          console.warn('No se pudo registrar login facial fallido (verifyOtp):', logErr)
        }

        console.error('UnifiedAuth: Error verificando OTP:', verifyError)
        toast({
          title: "Error",
          description: "No se pudo iniciar sesión con OTP",
          variant: "destructive",
        })
        return
      }

      // Log de login facial exitoso
      try {
        await supabase.rpc('registrar_intento_login_v2', {
          p_email: user.email,
          p_evento: 'login_exitoso',
          p_metodo: 'facial',
          p_exitoso: true,
          p_user_id: verifyData.user?.id || verifyData.session?.user.id
        });
      } catch (logErr) {
        console.warn('No se pudo registrar login facial exitoso:', logErr)
      }

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
              <TabsTrigger value="pin">
                <KeyRound className="h-4 w-4 mr-1" />
                PIN
              </TabsTrigger>
              <TabsTrigger value="facial">
                <Scan className="h-4 w-4 mr-1" />
                Facial
              </TabsTrigger>
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

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Primera vez? Usá los 4 últimos dígitos de tu DNI
                  </p>
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

            <TabsContent value="pin">
              <PinLoginAuth onSuccess={() => navigate(redirectTo)} />
            </TabsContent>

            <TabsContent value="facial">
              <FacialRecognitionAuth
                mode="login"
                onRegisterSuccess={() => {}}
                onLoginSuccess={handleFacialLogin}
              />
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