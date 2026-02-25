import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, Calendar, DollarSign, FileText, BarChart3, Clock, Receipt, Upload, Lock, TrendingUp } from "lucide-react";
import PeriodosContables from "@/components/rentabilidad/PeriodosContables";
import CentrosCosto from "@/components/rentabilidad/CentrosCosto";
import CargaSueldos from "@/components/rentabilidad/CargaSueldos";
import ParametrosCargasSociales from "@/components/rentabilidad/ParametrosCargasSociales";

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
  { id: "cierre", label: "Cierre", icon: Lock },
];

export default function Rentabilidad() {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = location.hash.replace("#", "") || "periodos";

  const handleTabChange = (value: string) => {
    navigate(`/finanzas/rentabilidad#${value}`, { replace: true });
  };

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

        <TabsContent value="periodos">
          <PeriodosContables />
        </TabsContent>
        <TabsContent value="centros-costo">
          <CentrosCosto />
        </TabsContent>
        <TabsContent value="sueldos">
          <CargaSueldos />
        </TabsContent>
        <TabsContent value="cargas-sociales">
          <ParametrosCargasSociales />
        </TabsContent>
        <TabsContent value="gastos">
          <ComingSoon label="Gastos por Sucursal" />
        </TabsContent>
        <TabsContent value="facturacion">
          <ComingSoon label="Facturación por Sucursal" />
        </TabsContent>
        <TabsContent value="partes-horas">
          <ComingSoon label="Partes de Horas" />
        </TabsContent>
        <TabsContent value="f931">
          <ComingSoon label="Importador F931" />
        </TabsContent>
        <TabsContent value="dashboard">
          <ComingSoon label="Dashboard de Rentabilidad" />
        </TabsContent>
        <TabsContent value="cierre">
          <ComingSoon label="Cierre de Período" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Lock className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm">Este módulo se implementará en próximas iteraciones</p>
    </div>
  );
}
