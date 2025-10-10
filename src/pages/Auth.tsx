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
  const [fullName, setFullName] = useState("");
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/gondolasedit`,
          data: {
            full_name: fullName,
          }
        }
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          toast("Este email ya está registrado. Intenta iniciar sesión.");
        } else {
          toast(`Error al registrarse: ${authError.message}`);
        }
        return;
      }

      // If auth user was created successfully, create the empleado record
      if (authData.user) {
        const [nombre, ...apellidoParts] = fullName.trim().split(' ');
        const apellido = apellidoParts.join(' ') || 'Nuevo';

        const { error: empleadoError } = await supabase
          .from('empleados')
          .insert({
            user_id: authData.user.id,
            nombre: nombre || 'Usuario',
            apellido: apellido,
            email: email,
            rol: 'empleado',
            fecha_ingreso: new Date().toISOString().split('T')[0],
            sucursal_id: '9682b6cf-f904-4497-918c-d0c9c061b9ec' // Default sucursal
          });

        if (empleadoError) {
          console.error('Error creating empleado:', empleadoError);
          // Don't show this error to user as auth was successful
        }
      }

      toast("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.");
    } catch (error) {
      console.error("Error in signUp:", error);
      toast("Error inesperado al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast("Credenciales inválidas. Verifica tu email y contraseña.");
        } else {
          toast(`Error al iniciar sesión: ${error.message}`);
        }
      } else {
        toast("¡Bienvenido de vuelta!");
      }
    } catch (error) {
      console.error("Error in signIn:", error);
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Email</TabsTrigger>
                <TabsTrigger value="facial">
                  <Scan className="h-4 w-4 mr-1" />
                  Facial
                </TabsTrigger>
                <TabsTrigger value="signup">Registro</TabsTrigger>
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
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Tu nombre completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 6 caracteres
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Registrando..." : "Crear Cuenta"}
                  </Button>
                </form>
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