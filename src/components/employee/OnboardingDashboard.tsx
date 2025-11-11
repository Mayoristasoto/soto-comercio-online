import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Lightbulb, 
  MessageCircle, 
  PlayCircle,
  Calendar,
  Clock
} from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useState } from "react";
import { OnboardingTour } from "./OnboardingTour";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OnboardingDashboardProps {
  empleadoId: string;
  empleadoNombre: string;
}

export const OnboardingDashboard = ({ 
  empleadoId, 
  empleadoNombre 
}: OnboardingDashboardProps) => {
  const { onboardingData, loading, tasks, markTourCompleted } = useOnboarding(empleadoId);
  const [runTour, setRunTour] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!onboardingData) return null;

  const diasDesdeInicio = Math.floor(
    (new Date().getTime() - new Date(onboardingData.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
  );
  const diasRestantes = Math.max(0, 30 - diasDesdeInicio);

  const completedTasks = tasks.filter(t => t.completed).length;

  const handleTourFinish = () => {
    setRunTour(false);
    markTourCompleted();
  };

  const handleTourSkip = () => {
    setRunTour(false);
  };

  return (
    <div className="space-y-6">
      <OnboardingTour 
        run={runTour} 
        onFinish={handleTourFinish}
        onSkip={handleTourSkip}
      />

      {/* Header de bienvenida */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                ¡Hola, {empleadoNombre}! 👋
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Te damos la bienvenida a nuestro equipo. Completa estas tareas para comenzar tu experiencia.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Inicio: {format(new Date(onboardingData.fecha_inicio), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                <span>
                  {diasRestantes} días restantes del período de bienvenida
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progreso */}
      <OnboardingProgress 
        percentage={onboardingData.porcentaje_completado}
        tasksCompleted={completedTasks}
        totalTasks={tasks.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist (ocupa 2 columnas) */}
        <div className="lg:col-span-2">
          <OnboardingChecklist 
            tasks={tasks}
            onStartTour={() => setRunTour(true)}
          />
        </div>

        {/* Recursos y ayuda (ocupa 1 columna) */}
        <div className="space-y-4">
          {/* Tour guiado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Tour Guiado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conoce el sistema con un tour interactivo paso a paso
              </p>
              <Button 
                onClick={() => setRunTour(true)}
                className="w-full"
                variant="outline"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Iniciar Tour
              </Button>
            </CardContent>
          </Card>

          {/* Instructivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Guía Rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Descarga el manual completo en PDF
              </p>
              <Button 
                onClick={() => navigate('/instructivo')}
                className="w-full"
                variant="outline"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Ver Instructivo
              </Button>
            </CardContent>
          </Card>

          {/* Tips útiles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Tips Útiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Revisa tu dashboard diariamente para estar al día</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Firma los documentos lo antes posible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Completa capacitaciones para ganar puntos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Mantén tu perfil actualizado</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Ayuda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                ¿Necesitas Ayuda?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Estamos aquí para apoyarte en tu inicio
              </p>
              <Button 
                onClick={() => navigate('/ayuda')}
                className="w-full"
                variant="outline"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contactar Soporte
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
