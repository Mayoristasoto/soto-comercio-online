import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { MisSolicitudes } from "@/components/solicitudes/MisSolicitudes";
import { NuevaSolicitud } from "@/components/solicitudes/NuevaSolicitud";
import { AprobacionSolicitudes } from "@/components/solicitudes/AprobacionSolicitudes";
import { ConfiguracionSolicitudes } from "@/components/solicitudes/ConfiguracionSolicitudes";

interface UserInfo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}

export default function Solicitudes() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: empleado, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (error) throw error;

      setUserInfo(empleado);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudo cargar la información del usuario</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAdmin = userInfo.rol === 'admin_rrhh';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Solicitudes</h1>
        <p className="text-muted-foreground mt-2">
          Administra tus solicitudes de días médicos, adelantos de sueldo y permisos
        </p>
      </div>

      <Tabs defaultValue="mis-solicitudes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="mis-solicitudes">Mis Solicitudes</TabsTrigger>
          <TabsTrigger value="nueva">Nueva Solicitud</TabsTrigger>
          {isAdmin && <TabsTrigger value="aprobaciones">Aprobaciones</TabsTrigger>}
          {isAdmin && <TabsTrigger value="configuracion">Configuración</TabsTrigger>}
        </TabsList>

        <TabsContent value="mis-solicitudes" className="mt-6">
          <MisSolicitudes empleadoId={userInfo.id} />
        </TabsContent>

        <TabsContent value="nueva" className="mt-6">
          <NuevaSolicitud empleadoId={userInfo.id} />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="aprobaciones" className="mt-6">
              <AprobacionSolicitudes />
            </TabsContent>

            <TabsContent value="configuracion" className="mt-6">
              <ConfiguracionSolicitudes />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}