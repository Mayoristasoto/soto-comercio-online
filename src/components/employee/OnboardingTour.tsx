import { useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useTheme } from 'next-themes';

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({ run, onFinish, onSkip }: OnboardingTourProps) => {
  const { theme } = useTheme();

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">¡Bienvenido al sistema!</h3>
          <p>Te guiaremos por las funciones principales. Puedes saltar este tour en cualquier momento.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="sidebar"]',
      content: 'Este es el menú lateral. Aquí encontrarás todas las secciones disponibles para ti.',
      placement: 'right',
    },
    {
      target: '[data-tour="dashboard"]',
      content: 'Tu dashboard muestra un resumen de tus tareas, capacitaciones y progreso.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tareas"]',
      content: 'Aquí puedes ver y completar las tareas que te han asignado.',
      placement: 'right',
    },
    {
      target: '[data-tour="documentos"]',
      content: 'En esta sección encontrarás los documentos que debes firmar.',
      placement: 'right',
    },
    {
      target: '[data-tour="capacitaciones"]',
      content: 'Accede a tus capacitaciones y mejora tus habilidades.',
      placement: 'right',
    },
    {
      target: '[data-tour="vacaciones"]',
      content: 'Solicita tus vacaciones y revisa tu saldo de días disponibles.',
      placement: 'right',
    },
    {
      target: '[data-tour="profile"]',
      content: 'En tu perfil puedes actualizar tu información personal y cambiar tu contraseña.',
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">¡Tour completado!</h3>
          <p>Ya conoces las funciones principales. ¡Comienza a explorar el sistema!</p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    
    if (status === STATUS.FINISHED) {
      onFinish();
    } else if (status === STATUS.SKIPPED || action === 'close') {
      onSkip();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar tour',
      }}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          textColor: theme === 'dark' ? '#f3f4f6' : '#111827',
          arrowColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: 10,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
    />
  );
};
