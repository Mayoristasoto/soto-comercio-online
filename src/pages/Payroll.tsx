import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ConveniosColectivos from "@/components/admin/payroll/ConveniosColectivos"
import ConceptosLiquidacion from "@/components/admin/payroll/ConceptosLiquidacion"
import ConfiguracionPayroll from "@/components/admin/payroll/ConfiguracionPayroll"
import GenerarReciboDemo from "@/components/admin/payroll/GenerarReciboDemo"
import ProcesarLiquidacion from "@/components/admin/payroll/ProcesarLiquidacion"
import { FileText, Calculator, Settings, Download, PlayCircle } from "lucide-react"

export default function Payroll() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Payroll</h1>
        <p className="text-muted-foreground">
          Configuración de convenios, conceptos y liquidación de sueldos
        </p>
      </div>

      <Tabs defaultValue="liquidacion" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="liquidacion" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Procesar Liquidación
          </TabsTrigger>
          <TabsTrigger value="convenios" className="gap-2">
            <FileText className="h-4 w-4" />
            Convenios
          </TabsTrigger>
          <TabsTrigger value="conceptos" className="gap-2">
            <Calculator className="h-4 w-4" />
            Conceptos
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="gap-2">
            <Settings className="h-4 w-4" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="generar" className="gap-2">
            <Download className="h-4 w-4" />
            Demo Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liquidacion" className="mt-6">
          <ProcesarLiquidacion />
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
