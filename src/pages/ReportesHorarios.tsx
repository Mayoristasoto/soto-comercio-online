import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, FileSpreadsheet } from 'lucide-react';
import { ReporteCobertura } from '@/components/fichero/ReporteCobertura';
import { DashboardDistribucion } from '@/components/fichero/DashboardDistribucion';
import { ExportarHorarios } from '@/components/fichero/ExportarHorarios';

export default function ReportesHorarios() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reportes y Análisis de Horarios
          </CardTitle>
          <CardDescription className="text-base">
            Visualiza métricas, cobertura y exporta información de los horarios del personal
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="cobertura" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cobertura" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Cobertura
          </TabsTrigger>
          <TabsTrigger value="distribucion" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Distribución
          </TabsTrigger>
          <TabsTrigger value="exportar" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobertura" className="mt-6">
          <ReporteCobertura />
        </TabsContent>

        <TabsContent value="distribucion" className="mt-6">
          <DashboardDistribucion />
        </TabsContent>

        <TabsContent value="exportar" className="mt-6">
          <ExportarHorarios />
        </TabsContent>
      </Tabs>
    </div>
  );
}
