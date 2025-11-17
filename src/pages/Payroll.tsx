import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ConveniosColectivos from "@/components/admin/payroll/ConveniosColectivos"
import ConceptosLiquidacion from "@/components/admin/payroll/ConceptosLiquidacion"
import ConfiguracionPayroll from "@/components/admin/payroll/ConfiguracionPayroll"
import GenerarReciboDemo from "@/components/admin/payroll/GenerarReciboDemo"
import ProcesarLiquidacion from "@/components/admin/payroll/ProcesarLiquidacion"
import ExportacionBancaria from "@/components/admin/payroll/ExportacionBancaria"
import ConceptosVariables from "@/components/admin/payroll/ConceptosVariables"
import CalculoSAC from "@/components/admin/payroll/CalculoSAC"
import DashboardAnaliticas from "@/components/admin/payroll/DashboardAnaliticas"
import HistoricoAuditoria from "@/components/admin/payroll/HistoricoAuditoria"
import NotificacionesPayroll from "@/components/admin/payroll/NotificacionesPayroll"
import IntegracionContabilidad from "@/components/admin/payroll/IntegracionContabilidad"
import { FileText, Calculator, Settings, Download, PlayCircle, DollarSign, TrendingUp, Gift, BarChart3, History, Bell, BookOpen } from "lucide-react"

export default function Payroll() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Payroll</h1>
        <p className="text-muted-foreground">
          Configuración de convenios, conceptos y liquidación de sueldos
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="liquidacion" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            <span className="hidden lg:inline">Liquidación</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden lg:inline">Notif.</span>
          </TabsTrigger>
          <TabsTrigger value="contabilidad" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden lg:inline">Contab.</span>
          </TabsTrigger>
          <TabsTrigger value="exportacion" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden lg:inline">Export.</span>
          </TabsTrigger>
          <TabsTrigger value="variables" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden lg:inline">Variables</span>
          </TabsTrigger>
          <TabsTrigger value="sac" className="gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden lg:inline">SAC</span>
          </TabsTrigger>
          <TabsTrigger value="convenios" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">Convenios</span>
          </TabsTrigger>
          <TabsTrigger value="conceptos" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden lg:inline">Conceptos</span>
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">Empleados</span>
          </TabsTrigger>
          <TabsTrigger value="generar" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline">Demo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardAnaliticas />
        </TabsContent>

        <TabsContent value="liquidacion" className="mt-6">
          <ProcesarLiquidacion />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoAuditoria />
        </TabsContent>

        <TabsContent value="notificaciones" className="mt-6">
          <NotificacionesPayroll />
        </TabsContent>

        <TabsContent value="contabilidad" className="mt-6">
          <IntegracionContabilidad />
        </TabsContent>

        <TabsContent value="exportacion" className="mt-6">
          <ExportacionBancaria />
        </TabsContent>

        <TabsContent value="variables" className="mt-6">
          <ConceptosVariables />
        </TabsContent>

        <TabsContent value="sac" className="mt-6">
          <CalculoSAC />
        </TabsContent>

        <TabsContent value="convenios" className="mt-6">
          <ConveniosColectivos />
        </TabsContent>

        <TabsContent value="conceptos" className="mt-6">
          <ConceptosLiquidacion />
        </TabsContent>

        <TabsContent value="configuracion" className="mt-6">
          <ConfiguracionPayroll />
        </TabsContent>

        <TabsContent value="generar" className="mt-6">
          <GenerarReciboDemo />
        </TabsContent>
      </Tabs>
    </div>
  )
}
