import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Hand, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  Smartphone,
  ArrowRight,
  Star
} from "lucide-react";

interface MobileTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileTutorial: React.FC<MobileTutorialProps> = ({
  isOpen,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      icon: <Hand className="h-8 w-8 text-primary" />,
      title: "Bienvenido al Layout Interactivo",
      description: "Explora fácilmente todas las ubicaciones disponibles para tu marca en nuestro local."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-blue-500" />,
      title: "Toca para Explorar",
      description: "Toca cualquier góndola o puntera para ver información detallada y opciones de contacto."
    },
    {
      icon: <ZoomIn className="h-8 w-8 text-green-500" />,
      title: "Gestos de Zoom",
      description: "Pellizca con dos dedos para acercar y alejar. También puedes usar los botones + y - en pantalla."
    },
    {
      icon: <Move className="h-8 w-8 text-purple-500" />,
      title: "Navegar el Mapa",
      description: "Arrastra con un dedo para moverte por el plano. Usa el mini-mapa para orientarte."
    },
    {
      icon: <Star className="h-8 w-8 text-yellow-500" />,
      title: "Contacto Directo",
      description: "Usa los botones flotantes para contactarnos directamente por WhatsApp o teléfono."
    }
  ];

  const currentTutorial = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Tutorial Rápido</h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="text-center space-y-4 mb-6">
            <div className="flex justify-center">
              {currentTutorial.icon}
            </div>
            <h4 className="text-xl font-semibold">
              {currentTutorial.title}
            </h4>
            <p className="text-muted-foreground">
              {currentTutorial.description}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mb-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentStep === 0}
              className="flex-1 mr-2"
            >
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 ml-2"
            >
              {currentStep === tutorialSteps.length - 1 ? 'Comenzar' : 'Siguiente'}
              {currentStep < tutorialSteps.length - 1 && (
                <ArrowRight className="h-4 w-4 ml-2" />
              )}
            </Button>
          </div>

          {/* Skip Option */}
          <div className="text-center mt-4">
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-xs text-muted-foreground"
            >
              Saltar tutorial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};