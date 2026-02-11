import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, User, FileSpreadsheet, Calculator, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MisVacaciones } from "@/components/vacaciones/MisVacaciones";
import { CalendarioVacaciones } from "@/components/vacaciones/CalendarioVacaciones";
import { AprobacionVacaciones } from "@/components/vacaciones/AprobacionVacaciones";
import { GestionBloqueos } from "@/components/vacaciones/GestionBloqueos";
import { VacacionesImport } from "@/components/vacaciones/VacacionesImport";
import { CalculadoraVacaciones } from "@/components/vacaciones/CalculadoraVacaciones";
import { Button } from "@/components/ui/button";

interface UserInfo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id?: string;
}

export default function Vacaciones() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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

      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, rol, sucursal_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        console.warn('No employee found for current user');
        return;
      }
      setUserInfo(data);
    } catch (error: any) {
      console.error('Error fetching user info:', error);
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
            <CardDescription>No se encontró información del usuario</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAdmin = userInfo.rol === 'admin_rrhh';
  const isGerente = userInfo.rol === 'gerente_sucursal';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Vacaciones</h1>
          <p className="text-muted-foreground">
            Solicita, gestiona y consulta las vacaciones del personal
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setImportDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar desde Excel
          </Button>
        )}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Reglas de Vacaciones Vigentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">Diciembre bloqueado:</span> ningún empleado puede solicitar vacaciones en diciembre.</li>
              <li><span className="font-medium text-foreground">Receso invernal (20/7 - 2/8):</span> solo se puede tomar 1 de las 2 semanas del receso.</li>
              <li><span className="font-medium text-foreground">Solicitud de 14 días:</span> combinar 1 semana fuera del receso + 1 semana del receso.</li>
              <li><span className="font-medium text-foreground">Gerentes de sucursal:</span> última semana de noviembre (24-30) bloqueada.</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mis-vacaciones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mis-vacaciones">
            <User className="h-4 w-4 mr-2" />
            Mis Vacaciones
          </TabsTrigger>
          <TabsTrigger value="calendario">
            <Calendar className="h-4 w-4 mr-2" />
            Calendario
          </TabsTrigger>
          {(isGerente || isAdmin) && (
            <TabsTrigger value="aprobaciones">
              <Clock className="h-4 w-4 mr-2" />
              Aprobaciones
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="bloqueos">
              Bloqueos
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="calculadora">
              <Calculator className="h-4 w-4 mr-2" />
              Calculadora LCT
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mis-vacaciones" className="space-y-4">
          <MisVacaciones empleadoId={userInfo.id} rol={userInfo.rol} />
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <CalendarioVacaciones 
            rol={userInfo.rol} 
            sucursalId={userInfo.sucursal_id}
          />
        </TabsContent>

        {(isGerente || isAdmin) && (
          <TabsContent value="aprobaciones" className="space-y-4">
            <AprobacionVacaciones 
              rol={userInfo.rol}
              sucursalId={userInfo.sucursal_id}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="bloqueos" className="space-y-4">
            <GestionBloqueos />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="calculadora" className="space-y-4">
            <CalculadoraVacaciones />
          </TabsContent>
        )}
      </Tabs>

      <VacacionesImport
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchUserInfo}
      />
    </div>
  );
}
