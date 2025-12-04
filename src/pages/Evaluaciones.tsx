import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardCheck, Users, TrendingUp, Calendar, UserPlus, GraduationCap } from "lucide-react";
import { EvaluacionesGerente } from "@/components/evaluaciones/EvaluacionesGerente";
import { EvaluacionesAdmin } from "@/components/evaluaciones/EvaluacionesAdmin";
import { HistorialEvaluaciones } from "@/components/evaluaciones/HistorialEvaluaciones";
import { GestionConceptos } from "@/components/evaluaciones/GestionConceptos";
import { AsignarEvaluacion } from "@/components/evaluaciones/AsignarEvaluacion";
import { Badge } from "@/components/ui/badge";
import TrainingManagement from "@/components/admin/TrainingManagement";

interface UserInfo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id?: string;
}

export default function Evaluaciones() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>();
  const [evaluacionesPendientes, setEvaluacionesPendientes] = useState(0);
  const [loading, setLoading] = useState(true);

  const isAdmin = userInfo?.rol === "admin_rrhh";
  const isGerente = userInfo?.rol === "gerente_sucursal";

  useEffect(() => {
    if (isGerente) {
      fetchEvaluacionesPendientes();
    } else {
      setLoading(false);
    }
  }, [userInfo]);

  const fetchEvaluacionesPendientes = async () => {
    try {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();

      const { count, error } = await supabase
        .from("evaluaciones_mensuales")
        .select("*", { count: "exact", head: true })
        .eq("evaluador_id", userInfo.id)
        .eq("mes", mesActual)
        .eq("anio", anioActual)
        .eq("estado", "pendiente");

      if (error) throw error;
      setEvaluacionesPendientes(count || 0);
    } catch (error) {
      console.error("Error fetching pending evaluations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && !isGerente) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a este módulo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Evaluaciones de Desempeño
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de evaluación mensual de empleados
          </p>
        </div>
        {isGerente && evaluacionesPendientes > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {evaluacionesPendientes} evaluaciones pendientes
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </div>
          </CardContent>
        </Card>

        {isGerente && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{evaluacionesPendientes}</div>
              <p className="text-xs text-muted-foreground">
                Evaluaciones por completar
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistema</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Escala 1-10</div>
            <p className="text-xs text-muted-foreground">
              Por cada concepto evaluado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={isGerente ? "evaluar" : "seguimiento"} className="space-y-4">
        <TabsList>
          {isGerente && (
            <TabsTrigger value="evaluar">
              <Users className="h-4 w-4 mr-2" />
              Evaluar Empleados
            </TabsTrigger>
          )}
          {isAdmin && (
            <>
              <TabsTrigger value="capacitaciones">
                <GraduationCap className="h-4 w-4 mr-2" />
                Capacitaciones
              </TabsTrigger>
              <TabsTrigger value="seguimiento">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Seguimiento
              </TabsTrigger>
              <TabsTrigger value="asignar">
                <UserPlus className="h-4 w-4 mr-2" />
                Asignar
              </TabsTrigger>
              <TabsTrigger value="conceptos">
                <Calendar className="h-4 w-4 mr-2" />
                Conceptos
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="historial">
            <TrendingUp className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        {isGerente && (
          <TabsContent value="evaluar" className="space-y-4">
            <EvaluacionesGerente 
              userInfo={userInfo} 
              onEvaluacionCompletada={fetchEvaluacionesPendientes}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <>
            <TabsContent value="capacitaciones" className="space-y-4">
              <TrainingManagement />
            </TabsContent>

            <TabsContent value="seguimiento" className="space-y-4">
              <EvaluacionesAdmin />
            </TabsContent>

            <TabsContent value="asignar" className="space-y-4">
              <AsignarEvaluacion />
            </TabsContent>

            <TabsContent value="conceptos" className="space-y-4">
              <GestionConceptos />
            </TabsContent>
          </>
        )}

        <TabsContent value="historial" className="space-y-4">
          <HistorialEvaluaciones userInfo={userInfo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
