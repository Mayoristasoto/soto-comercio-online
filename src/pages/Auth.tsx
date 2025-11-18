import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Store, Shield, Lock, Scan } from "lucide-react";
import FacialRecognitionAuth from "@/components/FacialRecognitionAuth";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error && error.message.includes('refresh_token_not_found')) {
          // Clear invalid session
          await supabase.auth.signOut();
          return;
        }
        if (session?.user) {
          navigate("/gondolasedit");
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Clear any corrupted session
        await supabase.auth.signOut();
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed, clear session
          supabase.auth.signOut();
          return;
        }
        if (session?.user) {
          navigate("/gondolasedit");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('🔐 [Auth.tsx] Iniciando proceso de login...');
    console.log('📧 Email ingresado:', email);
    console.log('🔑 Password presente:', !!password, 'Length:', password?.length || 0);

    try {
      console.log('⏳ [Auth.tsx] Llamando a supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📥 [Auth.tsx] Respuesta de Supabase:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error 
      });

      if (error) {
        console.error('❌ [Auth.tsx] Error de autenticación:', {
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

        if (error.message.includes("Invalid login credentials")) {
          toast("Credenciales inválidas. Verifica tu email y contraseña.");
        } else {
          toast(`Error al iniciar sesión: ${error.message}`);
        }
      } else {
        console.log('✅ [Auth.tsx] Login exitoso!', {
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

        toast("¡Bienvenido de vuelta!");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("💥 [Auth.tsx] Error inesperado en signIn:", error);
      toast("Error inesperado al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacialLogin = async (user: { nombre: string, apellido: string, email: string }) => {
    try {
      // El reconocimiento facial ya verificó la identidad del usuario
      // Ahora obtenemos su user_id para hacer login
      const { data: empleado, error: empleadoError } = await supabase
        .from('empleados')
        .select('user_id')
        .eq('email', user.email)
        .single();

      if (empleadoError || !empleado?.user_id) {
        toast("Error: No se pudo autenticar el usuario");
        return;
      }

      // Navegar directamente ya que el reconocimiento facial validó la identidad
      toast(`¡Bienvenido ${user.nombre} ${user.apellido}!`);
      navigate("/gondolasedit");
    } catch (error) {
      console.error("Error in facial login:", error);
      toast("Error en autenticación facial");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast(`Error: ${error.message}`);
      } else {
        toast("Revisa tu email para restablecer tu contraseña");
        setShowResetPassword(false);
        setResetEmail("");
      }
    } catch (error) {
      console.error("Error in password reset:", error);
      toast("Error al enviar email de recuperación");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Store className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mayorista Soto</h1>
            <p className="text-muted-foreground">Sistema de Gestión de Góndolas</p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Acceso Protegido
              </span>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Este sistema contiene información comercial sensible. Solo personal autorizado puede acceder.
            </p>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-xl">Acceso al Sistema</CardTitle>
            </div>
            <CardDescription>
              Ingresa con tu cuenta autorizada para gestionar las góndolas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Email</TabsTrigger>
                <TabsTrigger value="facial">
                  <Scan className="h-4 w-4 mr-1" />
                  Facial
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {showResetPassword ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
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
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Contraseña</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
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
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
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
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Solo personal autorizado de Mayorista Soto puede acceder al sistema
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;