
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

const ProgressBar = ({ currentStep, totalSteps, steps }: ProgressBarProps) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex justify-between items-center mb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
              index < currentStep ? 'bg-green-500' : index === currentStep ? 'bg-yellow-500' : 'bg-gray-300'
            }`}>
              {index < currentStep ? (
                <CheckCircle size={16} className="text-white" />
              ) : (
                <span className="text-white text-sm font-bold">{index + 1}</span>
              )}
            </div>
            <span className="text-xs text-center max-w-20">{step}</span>
          </div>
        ))}
      </div>
      <Progress value={progressPercentage} className="h-2" />
      <p className="text-center mt-2 text-sm text-gray-600">
        Paso {currentStep} de {totalSteps}: {steps[currentStep - 1]}
      </p>
    </div>
  );
};

export default ProgressBar;
