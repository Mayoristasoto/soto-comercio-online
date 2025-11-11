import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingData {
  id: string;
  empleado_id: string;
  fecha_inicio: string;
  fecha_completado: string | null;
  cambio_password_completado: boolean;
  perfil_completado: boolean;
  documentos_firmados: boolean;
  primera_capacitacion: boolean;
  primera_tarea_completada: boolean;
  foto_facial_subida: boolean;
  tour_completado: boolean;
  entregas_confirmadas: boolean;
  porcentaje_completado: number;
  ultima_actualizacion: string;
  notas: string | null;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: string;
  action?: () => void;
  link?: string;
}

export const useOnboarding = (empleadoId?: string) => {
  const { toast } = useToast();
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInOnboarding, setIsInOnboarding] = useState(false);

  useEffect(() => {
    if (empleadoId) {
      loadOnboarding();
    }
  }, [empleadoId]);

  const loadOnboarding = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('empleado_onboarding')
        .select('*')
        .eq('empleado_id', empleadoId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setOnboardingData(data);
        // Está en onboarding si no ha completado al 100% y tiene menos de 30 días desde el inicio
        const diasDesdeInicio = Math.floor(
          (new Date().getTime() - new Date(data.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
        );
        setIsInOnboarding(!data.fecha_completado && diasDesdeInicio <= 30);
      }
    } catch (error) {
      console.error('Error loading onboarding:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el progreso de bienvenida',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskKey: keyof OnboardingData, completed: boolean) => {
    if (!onboardingData) return;

    try {
      const { error } = await supabase
        .from('empleado_onboarding')
        .update({ [taskKey]: completed })
        .eq('empleado_id', empleadoId);

      if (error) throw error;

      await loadOnboarding();

      toast({
        title: '¡Progreso actualizado!',
        description: completed 
          ? 'Has completado una tarea de bienvenida' 
          : 'Tarea marcada como pendiente',
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el progreso',
        variant: 'destructive',
      });
    }
  };

  const markTourCompleted = () => updateTask('tour_completado', true);
  const markPasswordChanged = () => updateTask('cambio_password_completado', true);
  const markProfileCompleted = () => updateTask('perfil_completado', true);

  const getTasks = (): OnboardingTask[] => {
    if (!onboardingData) return [];

    return [
      {
        id: 'password',
        title: 'Cambiar contraseña',
        description: 'Crea una contraseña segura y personal',
        completed: onboardingData.cambio_password_completado,
        icon: 'KeyRound',
        link: '/configuracion',
      },
      {
        id: 'profile',
        title: 'Completar perfil',
        description: 'Agrega tu información personal y foto',
        completed: onboardingData.perfil_completado,
        icon: 'User',
        link: '/perfil',
      },
      {
        id: 'tour',
        title: 'Tour del sistema',
        description: 'Conoce las funciones principales',
        completed: onboardingData.tour_completado,
        icon: 'Map',
      },
      {
        id: 'documents',
        title: 'Firmar documentos',
        description: 'Firma los documentos obligatorios',
        completed: onboardingData.documentos_firmados,
        icon: 'FileText',
        link: '/mis-documentos',
      },
      {
        id: 'facial',
        title: 'Subir foto facial',
        description: 'Para reconocimiento facial en fichaje',
        completed: onboardingData.foto_facial_subida,
        icon: 'Camera',
        link: '/subir-foto-facial',
      },
      {
        id: 'training',
        title: 'Primera capacitación',
        description: 'Completa tu primera capacitación',
        completed: onboardingData.primera_capacitacion,
        icon: 'GraduationCap',
        link: '/capacitaciones',
      },
      {
        id: 'task',
        title: 'Completar primera tarea',
        description: 'Finaliza tu primera tarea asignada',
        completed: onboardingData.primera_tarea_completada,
        icon: 'CheckSquare',
        link: '/mis-tareas',
      },
      {
        id: 'deliveries',
        title: 'Confirmar entregas',
        description: 'Confirma recepción de uniformes y equipos',
        completed: onboardingData.entregas_confirmadas,
        icon: 'Package',
        link: '/entregas',
      },
    ];
  };

  return {
    onboardingData,
    loading,
    isInOnboarding,
    tasks: getTasks(),
    updateTask,
    markTourCompleted,
    markPasswordChanged,
    markProfileCompleted,
    reload: loadOnboarding,
  };
};
