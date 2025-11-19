import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  Circle, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Award,
  Sparkles,
  Target
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface OnboardingData {
  id: string;
  cambio_password_completado: boolean;
  documentos_firmados: boolean;
  entregas_confirmadas: boolean;
  foto_facial_subida: boolean;
  perfil_completado: boolean;
  primera_capacitacion: boolean;
  primera_tarea_completada: boolean;
  tour_completado: boolean;
  porcentaje_completado: number;
  fecha_inicio: string;
  fecha_completado: string | null;
}

interface TareaOnboarding {
  id: string;
  titulo: string;
  descripcion: string;
  completada: boolean;
  accion?: () => void;
  ruta?: string;
  icon: any;
  categoria: 'esencial' | 'importante' | 'opcional';
}

export function OnboardingDashboardEnhanced() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tareas, setTareas] = useState<TareaOnboarding[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!empleado) return;

      const { data, error } = await supabase
        .from('empleado_onboarding')
        .select('*')
        .eq('empleado_id', empleado.id)
        .single();

      if (error) throw error;

      setOnboarding(data);
      generarTareas(data);
    } catch (error) {
      console.error('Error cargando onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarTareas = (data: OnboardingData) => {
    const tareasGeneradas: TareaOnboarding[] = [
      {
        id: 'password',
        titulo: 'Cambiar contraseña inicial',
        descripcion: 'Actualiza tu contraseña por una segura y personal',
        completada: data.cambio_password_completado,
        ruta: '/mi-configuracion',
        icon: CheckCircle2,
        categoria: 'esencial'
      },
      {
        id: 'perfil',
        titulo: 'Completar perfil',
        descripcion: 'Agrega tu información personal y de contacto',
        completada: data.perfil_completado,
        ruta: '/mi-configuracion',
        icon: CheckCircle2,
        categoria: 'esencial'
      },
      {
        id: 'foto',
        titulo: 'Subir foto facial',
        descripcion: 'Necesaria para el sistema de fichaje',
        completada: data.foto_facial_subida,
        ruta: '/autogestion/subir-foto-facial',
        icon: CheckCircle2,
        categoria: 'esencial'
      },
      {
        id: 'documentos',
        titulo: 'Firmar documentos',
        descripcion: 'Lee y firma los documentos obligatorios',
        completada: data.documentos_firmados,
        ruta: '/mi-dashboard',
        icon: CheckCircle2,
        categoria: 'esencial'
      },
      {
        id: 'entregas',
        titulo: 'Confirmar entregas',
        descripcion: 'Confirma la recepción de elementos de trabajo',
        completada: data.entregas_confirmadas,
        ruta: '/mi-dashboard',
        icon: CheckCircle2,
        categoria: 'importante'
      },
      {
        id: 'tour',
        titulo: 'Completar tour guiado',
        descripcion: 'Conoce todas las funcionalidades del sistema',
        completada: data.tour_completado,
        icon: CheckCircle2,
        categoria: 'importante'
      },
      {
        id: 'capacitacion',
        titulo: 'Primera capacitación',
        descripcion: 'Completa tu primera capacitación asignada',
        completada: data.primera_capacitacion,
        ruta: '/mi-dashboard',
        icon: CheckCircle2,
        categoria: 'importante'
      },
      {
        id: 'tarea',
        titulo: 'Primera tarea',
        descripcion: 'Completa tu primera tarea asignada',
        completada: data.primera_tarea_completada,
        ruta: '/operaciones/tareas',
        icon: CheckCircle2,
        categoria: 'opcional'
      },
    ];

    setTareas(tareasGeneradas);
  };

  const ejecutarAccion = (tarea: TareaOnboarding) => {
    if (tarea.ruta) {
      navigate(tarea.ruta);
    } else if (tarea.accion) {
      tarea.accion();
    }
  };

  const getMensajeMotivacional = (porcentaje: number) => {
    if (porcentaje === 0) return "¡Bienvenido! Comencemos tu proceso de incorporación 🎉";
    if (porcentaje < 25) return "¡Buen comienzo! Sigamos avanzando 💪";
    if (porcentaje < 50) return "¡Vas muy bien! Ya casi a la mitad 🚀";
    if (porcentaje < 75) return "¡Excelente progreso! Ya falta poco 🌟";
    if (porcentaje < 100) return "¡Casi terminamos! Un último esfuerzo ⭐";
    return "¡Felicitaciones! Has completado tu onboarding 🎊";
  };

  const getDiasRestantes = (fechaInicio: string) => {
    const inicio = new Date(fechaInicio);
    const hoy = new Date();
    const diasTranscurridos = differenceInDays(hoy, inicio);
    const diasObjetivo = 14; // 2 semanas para completar
    return Math.max(0, diasObjetivo - diasTranscurridos);
  };

  if (loading) {
    return <div className="text-center p-8">Cargando...</div>;
  }

  if (!onboarding) {
    return null;
  }

  const diasRestantes = getDiasRestantes(onboarding.fecha_inicio);
  const tareasEsenciales = tareas.filter(t => !t.completada && t.categoria === 'esencial');
  const tareasImportantes = tareas.filter(t => !t.completada && t.categoria === 'importante');

  return (
    <div className="space-y-6">
      {/* Header Motivacional */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                {getMensajeMotivacional(onboarding.porcentaje_completado)}
              </CardTitle>
              <CardDescription>
                {onboarding.porcentaje_completado < 100 ? (
                  <>
                    Te quedan {diasRestantes} días para completar tu incorporación
                  </>
                ) : (
                  <>
                    Completado el {format(new Date(onboarding.fecha_completado!), 'dd/MM/yyyy', { locale: es })}
                  </>
                )}
              </CardDescription>
            </div>
            {onboarding.porcentaje_completado === 100 && (
              <Trophy className="h-12 w-12 text-yellow-500" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso General</span>
              <span className="font-bold text-primary text-lg">{onboarding.porcentaje_completado}%</span>
            </div>
            <Progress value={onboarding.porcentaje_completado} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Tareas Esenciales */}
      {tareasEsenciales.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Target className="h-5 w-5" />
              Tareas Esenciales
              <Badge variant="destructive">{tareasEsenciales.length}</Badge>
            </CardTitle>
            <CardDescription>
              Completa estas tareas lo antes posible para acceder a todas las funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tareasEsenciales.map(tarea => (
              <div key={tarea.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Circle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">{tarea.titulo}</p>
                    <p className="text-sm text-muted-foreground">{tarea.descripcion}</p>
                  </div>
                </div>
                {tarea.ruta && (
                  <Button onClick={() => ejecutarAccion(tarea)} size="sm">
                    Completar
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tareas Importantes */}
      {tareasImportantes.length > 0 && (
        <Card className="border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <TrendingUp className="h-5 w-5" />
              Tareas Importantes
              <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                {tareasImportantes.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Recomendamos completar estas tareas para aprovechar al máximo el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tareasImportantes.map(tarea => (
              <div key={tarea.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Circle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">{tarea.titulo}</p>
                    <p className="text-sm text-muted-foreground">{tarea.descripcion}</p>
                  </div>
                </div>
                {tarea.ruta && (
                  <Button onClick={() => ejecutarAccion(tarea)} size="sm" variant="outline">
                    Ir
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tareas Completadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Award className="h-5 w-5" />
            Tareas Completadas
            <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
              {tareas.filter(t => t.completada).length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tareas.filter(t => t.completada).map(tarea => (
            <div key={tarea.id} className="flex items-center gap-3 p-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-muted-foreground line-through">{tarea.titulo}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
