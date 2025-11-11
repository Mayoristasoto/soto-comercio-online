import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingTask } from "@/hooks/useOnboarding";
import { 
  CheckSquare, 
  GraduationCap, 
  FileText, 
  Camera, 
  Package, 
  User, 
  KeyRound,
  Map,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OnboardingChecklistProps {
  tasks: OnboardingTask[];
  onStartTour?: () => void;
}

const iconMap = {
  CheckSquare,
  GraduationCap,
  FileText,
  Camera,
  Package,
  User,
  KeyRound,
  Map,
};

export const OnboardingChecklist = ({ tasks, onStartTour }: OnboardingChecklistProps) => {
  const navigate = useNavigate();

  const handleTaskClick = (task: OnboardingTask) => {
    if (task.id === 'tour' && onStartTour) {
      onStartTour();
    } else if (task.link) {
      navigate(task.link);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Lista de Bienvenida
            </CardTitle>
            <CardDescription>
              Completa estas tareas para familiarizarte con el sistema
            </CardDescription>
          </div>
          <Badge variant={completedCount === tasks.length ? "default" : "secondary"}>
            {completedCount}/{tasks.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tareas pendientes */}
          {pendingTasks.map((task) => {
            const Icon = iconMap[task.icon as keyof typeof iconMap];
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            );
          })}

          {/* Tareas completadas */}
          {completedTasks.length > 0 && (
            <>
              <div className="pt-3 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Completadas
                </h4>
              </div>
              {completedTasks.map((task) => {
                const Icon = iconMap[task.icon as keyof typeof iconMap];
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 opacity-75"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-through">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {completedCount === tasks.length && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    ¡Felicitaciones!
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Has completado tu proceso de bienvenida
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
