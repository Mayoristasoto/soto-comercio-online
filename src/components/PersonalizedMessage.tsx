
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PersonalizedMessage = () => {
  const [userName, setUserName] = useState<string>('');
  const [showPersonalization, setShowPersonalization] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('gulero-user-name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const handleNameSubmit = (name: string) => {
    setUserName(name);
    localStorage.setItem('gulero-user-name', name);
    setShowPersonalization(false);
  };

  if (!userName && !showPersonalization) {
    return (
      <Card className="bg-gradient-to-r from-green-100 to-yellow-100 border-2 border-green-300 mb-8 max-w-md mx-auto">
        <CardContent className="p-4 text-center">
          <p className="text-green-800 mb-3">¿Cómo te gusta que te llamen?</p>
          <input
            type="text"
            placeholder="Tu nombre o apodo"
            className="w-full p-2 rounded border border-green-300 mb-3"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleNameSubmit(e.currentTarget.value);
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Tu nombre o apodo"]') as HTMLInputElement;
              if (input?.value) handleNameSubmit(input.value);
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            Personalizar mi experiencia
          </button>
        </CardContent>
      </Card>
    );
  }

  if (userName) {
    return (
      <Card className="bg-gradient-to-r from-green-100 to-yellow-100 border-2 border-green-300 mb-8 max-w-md mx-auto">
        <CardContent className="p-4 text-center">
          <Badge className="mb-2 bg-green-500">¡Hola {userName}! 👋</Badge>
          <p className="text-green-800">
            Sabemos que buscas los mejores alfajores. ¡El Combo GULERO es perfecto para vos!
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default PersonalizedMessage;
