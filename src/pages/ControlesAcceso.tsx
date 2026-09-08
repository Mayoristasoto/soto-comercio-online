import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Loader2, LogOut, Lock, Mail } from "lucide-react";

interface Sesion {
  nombre: string;
  apellido: string;
  rol: string;
}

export default function ControlesAcceso() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarSesion = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSesion(null);
        return;
      }
      const { data: empleado } = await supabase
        .from("empleados")
        .select("nombre, apellido, rol, activo")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!empleado || !empleado.activo || empleado.rol !== "admin_rrhh") {
        setSesion(null);
        setError("Esta cuenta no tiene permiso para acceder a los controles.");
        await supabase.auth.signOut();
        return;
      }
      setSesion({ nombre: empleado.nombre, apellido: empleado.apellido, rol: empleado.rol });
      setError(null);
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    cargarSesion();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSesion(null);
        setVerificando(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError("Email o contraseña incorrectos.");
        return;
      }
      setVerificando(true);
      await cargarSesion();
    } finally {
      setEnviando(false);
    }
  };

  const salir = async () => {
    await supabase.auth.signOut();
    setSesion(null);
    toast.success("Sesión cerrada");
    navigate("/controles", { replace: true });
  };

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <CardTitle>Controles de sucursal</CardTitle>
            <CardDescription>Acceso exclusivo para administración</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={ingresar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="controles-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="controles-email"
                    type="email"
                    autoComplete="username"
                    required
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="controles-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="controles-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <span className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Controles
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {sesion.nombre} {sesion.apellido}
            </span>
            <Button variant="ghost" size="sm" onClick={salir}>
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
