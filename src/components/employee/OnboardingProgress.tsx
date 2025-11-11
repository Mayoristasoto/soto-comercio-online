import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Trophy, Sparkles } from "lucide-react";
import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';

interface OnboardingProgressProps {
  percentage: number;
  tasksCompleted: number;
  totalTasks: number;
}

export const OnboardingProgress = ({ 
  percentage, 
  tasksCompleted, 
  totalTasks 
}: OnboardingProgressProps) => {
  const [previousPercentage, setPreviousPercentage] = useState(percentage);

  useEffect(() => {
    // Celebrar cuando se completa al 100%
    if (percentage === 100 && previousPercentage < 100) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    setPreviousPercentage(percentage);
  }, [percentage]);

  const getProgressMessage = () => {
    if (percentage === 100) {
      return {
        icon: <Trophy className="h-5 w-5 text-yellow-500" />,
        text: "¡Felicitaciones! Has completado tu bienvenida",
        color: "text-green-600"
      };
    } else if (percentage >= 75) {
      return {
        icon: <Sparkles className="h-5 w-5 text-blue-500" />,
        text: "¡Excelente progreso! Ya casi terminas",
        color: "text-blue-600"
      };
    } else if (percentage >= 50) {
      return {
        icon: <Rocket className="h-5 w-5 text-purple-500" />,
        text: "¡Vas muy bien! Continúa así",
        color: "text-purple-600"
      };
    } else {
      return {
        icon: <Rocket className="h-5 w-5 text-primary" />,
        text: "¡Bienvenido! Completa estas tareas para comenzar",
        color: "text-primary"
      };
    }
  };

  const message = getProgressMessage();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {message.icon}
            <div className="flex-1">
              <h3 className={`font-semibold ${message.color}`}>
                {message.text}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tasksCompleted} de {totalTasks} tareas completadas
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${message.color}`}>
                {percentage}%
              </div>
            </div>
          </div>
          
          <Progress value={percentage} className="h-3" />
          
          {percentage < 100 && (
            <p className="text-xs text-muted-foreground text-center">
              Completa todas las tareas para desbloquear funciones avanzadas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
