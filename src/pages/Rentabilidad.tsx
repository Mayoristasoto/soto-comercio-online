import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Calendar, DollarSign, FileText, BarChart3, Clock, Receipt, Upload, Lock, TrendingUp, Activity } from "lucide-react";
import PeriodosContables from "@/components/rentabilidad/PeriodosContables";
import CentrosCosto from "@/components/rentabilidad/CentrosCosto";
import CargaSueldos from "@/components/rentabilidad/CargaSueldos";
import ParametrosCargasSociales from "@/components/rentabilidad/ParametrosCargasSociales";
import GastosSucursal from "@/components/rentabilidad/GastosSucursal";
import FacturacionSucursal from "@/components/rentabilidad/FacturacionSucursal";
import PartesHoras from "@/components/rentabilidad/PartesHoras";
import ImportadorF931 from "@/components/rentabilidad/ImportadorF931";
import DashboardRentabilidad from "@/components/rentabilidad/DashboardRentabilidad";
import CierrePeriodo from "@/components/rentabilidad/CierrePeriodo";
import MetricasProductividad from "@/components/rentabilidad/MetricasProductividad";

const tabs = [
  { id: "periodos", label: "Períodos", icon: Calendar },
  { id: "centros-costo", label: "Centros de Costo", icon: Building2 },
  { id: "sueldos", label: "Sueldos", icon: DollarSign },
  { id: "cargas-sociales", label: "Cargas Sociales", icon: FileText },
  { id: "gastos", label: "Gastos", icon: Receipt },
  { id: "facturacion", label: "Facturación", icon: TrendingUp },
  { id: "partes-horas", label: "Partes de Horas", icon: Clock },
  { id: "f931", label: "F931", icon: Upload },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "metricas", label: "Métricas", icon: Activity },
  { id: "cierre", label: "Cierre", icon: Lock },
];

export default function Rentabilidad() {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash.replace("#", "") || "periodos";
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/auth"); return; }
        const { data: emp } = await supabase
          .from("empleados")
          .select("rol, activo")
          .eq("user_id", user.id)
          .single();
        if (!emp || !emp.activo || emp.rol !== "admin_rrhh") { navigate("/dashboard"); return; }
        setLoading(false);
      } catch { navigate("/auth"); }
    })();
  }, [navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/finanzas/rentabilidad#${value}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rentabilidad por Sucursal</h1>
        <p className="text-muted-foreground">
          Gestión operativa, costos laborales y análisis de rentabilidad
        </p>
      </div>

      <Tabs value={hash} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="periodos"><PeriodosContables /></TabsContent>
        <TabsContent value="centros-costo"><CentrosCosto /></TabsContent>
        <TabsContent value="sueldos"><CargaSueldos /></TabsContent>
        <TabsContent value="cargas-sociales"><ParametrosCargasSociales /></TabsContent>
        <TabsContent value="gastos"><GastosSucursal /></TabsContent>
        <TabsContent value="facturacion"><FacturacionSucursal /></TabsContent>
        <TabsContent value="partes-horas"><PartesHoras /></TabsContent>
        <TabsContent value="f931"><ImportadorF931 /></TabsContent>
        <TabsContent value="dashboard"><DashboardRentabilidad /></TabsContent>
        <TabsContent value="metricas"><MetricasProductividad /></TabsContent>
        <TabsContent value="cierre"><CierrePeriodo /></TabsContent>
      </Tabs>
    </div>
  );
}
