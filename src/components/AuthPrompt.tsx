import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthPromptProps {
  onAuthSuccess: () => void;
}

export const AuthPrompt = ({ onAuthSuccess }: AuthPromptProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Limpiar estado de autenticación previo para evitar conflictos
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      if (isSignUp) {
        // SEGURIDAD: Registro con metadata mínima para evitar exposición
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/gondolasedit`,
            data: {
              full_name: email.split('@')[0] // Usar parte del email como nombre inicial
            }
          }
        });

        if (error) throw error;
        
        toast.success("Cuenta creada exitosamente. Revisa tu email para confirmar.");
      } else {
        // SEGURIDAD: Login con limpieza previa del estado
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Verificar que el perfil del usuario está creado
        if (data.user) {
          console.log('✅ Usuario autenticado:', data.user.id);
          toast.success("Inicio de sesión exitoso");
          onAuthSuccess();
        }
      }
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      
      // Manejo mejorado de errores para proteger información
      let userFriendlyMessage = 'Error de autenticación';
      
      if (error.message?.includes('Invalid login credentials')) {
        userFriendlyMessage = 'Email o contraseña incorrectos';
      } else if (error.message?.includes('Email not confirmed')) {
        userFriendlyMessage = 'Por favor confirma tu email antes de iniciar sesión';
      } else if (error.message?.includes('User already registered')) {
        userFriendlyMessage = 'Este email ya está registrado';
      }
      
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acceso Administrativo</CardTitle>
          <p className="text-muted-foreground">
            Ingresa tus credenciales para acceder a la información completa de góndolas
          </p>
        </CardHeader>
        
        <CardContent>
          <Alert className="mb-6">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Área segura:</strong> Esta sección contiene información comercial sensible 
              como contratos, marcas y layout estratégico del negocio.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...'}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {isSignUp 
                  ? '¿Ya tienes cuenta? Inicia sesión' 
                  : '¿No tienes cuenta? Crear una'
                }
              </button>
            </div>
          </form>

          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>Esta aplicación utiliza encriptación para proteger los datos comerciales</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};