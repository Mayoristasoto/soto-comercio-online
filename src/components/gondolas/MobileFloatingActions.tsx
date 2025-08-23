import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageCircle, 
  Phone, 
  Star, 
  ChevronUp, 
  ChevronDown,
  HelpCircle,
  Zap
} from "lucide-react";
import { useMobileDetection } from "@/hooks/use-mobile-detection";

interface MobileFloatingActionsProps {
  availableSpaces: number;
  totalSpaces: number;
  onContactPress: () => void;
  onTutorialPress: () => void;
}

export const MobileFloatingActions: React.FC<MobileFloatingActionsProps> = ({
  availableSpaces,
  totalSpaces,
  onContactPress,
  onTutorialPress
}) => {
  const isMobile = useMobileDetection();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isMobile) return null;

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hola! Estoy explorando las góndolas disponibles en Mayorista Soto. Me interesa conocer más sobre los espacios disponibles y sus condiciones.`
    );
    const whatsappUrl = `https://wa.me/5492234890963?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Compact Stats Bar */}
      <div className="fixed top-16 left-0 right-0 z-20 px-4">
        <Card className="bg-card/95 backdrop-blur-sm border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{availableSpaces}</span>
                  <span className="text-muted-foreground">Disponibles</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">{totalSpaces - availableSpaces}</span>
                  <span className="text-muted-foreground">Ocupados</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTutorialPress}
                className="h-8 w-8 p-0"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-4 left-4 z-30">
        <div className="space-y-3">
          {/* Expanded Actions */}
          {isExpanded && (
            <div className="space-y-2 animate-scale-in">
              <Button
                onClick={handleWhatsAppContact}
                className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
                size="icon"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
              
              <Button
                onClick={() => window.open('tel:+5492234890963', '_self')}
                className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
                size="icon"
              >
                <Phone className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* Main Toggle Button */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-xl"
            size="icon"
          >
            {isExpanded ? (
              <ChevronDown className="h-6 w-6" />
            ) : (
              <Star className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick Contact Banner */}
      <div className="fixed bottom-4 right-4 z-20">
        <Button
          onClick={handleWhatsAppContact}
          className="bg-green-600 hover:bg-green-700 shadow-lg px-4 py-2 h-auto"
        >
          <Zap className="h-4 w-4 mr-2" />
          <div className="text-left">
            <div className="text-xs font-medium">Reserva Rápida</div>
            <div className="text-xs opacity-90">WhatsApp</div>
          </div>
        </Button>
      </div>
    </>
  );
};