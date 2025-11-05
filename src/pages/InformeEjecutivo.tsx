import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, TrendingUp, Users, Shield, Zap } from "lucide-react";
import { generateInformeEjecutivoPDF } from "@/utils/informeEjecutivoPDF";
import { toast } from "sonner";

const InformeEjecutivo = () => {
  const handleGeneratePDF = () => {
    try {
      const fileName = generateInformeEjecutivoPDF();
      toast.success("Informe generado exitosamente", {
        description: `El archivo ${fileName} ha sido descargado`,
      });
    } catch (error) {
      console.error("Error al generar el informe:", error);
      toast.error("Error al generar el informe", {
        description: "Por favor, intente nuevamente",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">
          Informe Ejecutivo
        </h1>
        <p className="text-muted-foreground text-lg">
          Documentación completa del Sistema Integral de Gestión de RRHH
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Gestión Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Control horario, evaluaciones, vacaciones y más en una sola plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
            <CardTitle className="text-lg">ROI en 6-8 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ahorro promedio de $108,000 anuales para empresas de 100 empleados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-blue-600 mb-2" />
            <CardTitle className="text-lg">Máxima Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Encriptación de extremo a extremo y cumplimiento normativo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contenido del Informe
          </CardTitle>
          <CardDescription>
            Documento profesional de 11 páginas con información detallada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Secciones Principales
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li>• Resumen Ejecutivo</li>
                <li>• Control Horario y Asistencia</li>
                <li>• Evaluaciones de Desempeño</li>
                <li>• Gestión de Vacaciones</li>
                <li>• Gamificación y Reconocimiento</li>
                <li>• Módulos Adicionales</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Información Clave
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                <li>• Tecnología y Seguridad</li>
                <li>• Análisis de ROI Detallado</li>
                <li>• Proceso de Implementación</li>
                <li>• Casos de Uso Reales</li>
                <li>• Beneficios Cuantificables</li>
                <li>• Próximos Pasos</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
              Destacados del Informe
            </h4>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
              <li>✓ Reducción de hasta 70% en tiempo administrativo</li>
              <li>✓ Incremento del 40% en engagement de empleados</li>
              <li>✓ Precisión del 99.9% en registro de asistencia</li>
              <li>✓ Ahorro de 15-20 horas semanales por gerente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>Descargar Informe Ejecutivo</CardTitle>
          <CardDescription>
            Obtenga el documento completo en formato PDF para su presentación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El informe incluye análisis detallado de funcionalidades, beneficios de negocio,
            casos de uso, retorno de inversión y proceso de implementación. Ideal para
            presentar ante ejecutivos y tomadores de decisiones.
          </p>
          <Button 
            onClick={handleGeneratePDF}
            size="lg"
            className="w-full md:w-auto"
          >
            <Download className="mr-2 h-5 w-5" />
            Generar y Descargar PDF
          </Button>
        </CardContent>
      </Card>

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Uso Recomendado
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
          <p>
            <strong>Para presentaciones ejecutivas:</strong> Utilice el informe completo para
            mostrar el valor integral de la solución.
          </p>
          <p>
            <strong>Para propuestas comerciales:</strong> El análisis de ROI y casos de uso
            son ideales para justificar la inversión.
          </p>
          <p>
            <strong>Para evaluación técnica:</strong> Las secciones de tecnología y seguridad
            proporcionan detalles de la infraestructura.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InformeEjecutivo;
