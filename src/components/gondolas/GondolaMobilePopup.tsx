import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, MessageCircle, Phone, Star, Calendar, Store } from "lucide-react";
import { Gondola } from "@/pages/Gondolas";
import { useMobileDetection } from "@/hooks/use-mobile-detection";

interface GondolaMobilePopupProps {
  gondola: Gondola;
  position: { x: number; y: number };
  onClose: () => void;
  onRequestSpace: (gondola: Gondola) => void;
}

export const GondolaMobilePopup: React.FC<GondolaMobilePopupProps> = ({ 
  gondola, 
  position, 
  onClose, 
  onRequestSpace 
}) => {
  const isMobile = useMobileDetection();
  
  // Calculate popup position to stay within screen bounds
  const calculatePosition = () => {
    if (!isMobile) {
      return { left: position.x + 10, top: position.y + 10 };
    }
    
    // Mobile: center popup or position responsively
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const popupWidth = 320;
    const popupHeight = 280;
    
    let left = position.x - popupWidth / 2;
    let top = position.y - popupHeight / 2;
    
    // Keep within screen bounds
    if (left < 10) left = 10;
    if (left + popupWidth > screenWidth - 10) left = screenWidth - popupWidth - 10;
    if (top < 10) top = 10;
    if (top + popupHeight > screenHeight - 10) top = screenHeight - popupHeight - 10;
    
    return { left, top };
  };

  const popupPosition = calculatePosition();

  const getStatusColor = (status: 'available' | 'occupied') => {
    return status === 'available' ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = (status: 'available' | 'occupied') => {
    return status === 'available' ? 'Disponible' : 'Ocupado';
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hola! Estoy interesado en el espacio ${gondola.section} (${gondola.type === 'puntera' ? 'Puntera' : 'Góndola'}) que está ${getStatusText(gondola.status).toLowerCase()}. ¿Podrían darme más información sobre disponibilidad y precios?`
    );
    const whatsappUrl = `https://wa.me/5492234890963?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      <div
        className={`
          fixed z-50 animate-scale-in
          ${isMobile ? 'bottom-4 left-4 right-4' : ''}
        `}
        style={isMobile ? {} : {
          left: `${popupPosition.left}px`,
          top: `${popupPosition.top}px`,
          maxWidth: '320px'
        }}
      >
        <Card className="shadow-xl border-2">
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  {gondola.section}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Status and Type */}
            <div className="flex items-center gap-2">
              <Badge 
                className={`${getStatusColor(gondola.status)} text-white`}
              >
                {getStatusText(gondola.status)}
              </Badge>
              <Badge variant="outline">
                {gondola.type === 'puntera' ? 'Puntera' : 'Góndola'}
              </Badge>
            </div>

            {/* Image */}
            {gondola.image_url && (
              <div className="w-full h-24 rounded-md overflow-hidden bg-muted">
                <img 
                  src={gondola.image_url} 
                  alt={`Imagen de ${gondola.section}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Information */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Categoría:</span>
                <span>{gondola.category}</span>
              </div>
              
              {gondola.brand && (
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Marca:</span>
                  <span>{gondola.brand}</span>
                </div>
              )}
              
              {gondola.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Fin de contrato:</span>
                  <span>{new Date(gondola.endDate).toLocaleDateString()}</span>
                </div>
              )}
              
              {gondola.status === 'available' && !gondola.brand && (
                <div className="flex items-center gap-2 text-green-600">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Disponible inmediatamente</span>
                </div>
              )}
            </div>

            {/* Location Benefits */}
            {gondola.status === 'available' && (
              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium text-sm mb-2">Ventajas de esta ubicación:</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Alto flujo de clientes diario</li>
                  <li>• Visibilidad estratégica</li>
                  <li>• Fácil acceso para clientes</li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {gondola.status === 'available' ? (
                <>
                  <Button 
                    onClick={() => onRequestSpace(gondola)}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Reservar Este Espacio
                  </Button>
                  <Button 
                    onClick={handleWhatsAppContact}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Consultar por WhatsApp
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleWhatsAppContact}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Consultar Disponibilidad
                </Button>
              )}
            </div>

            {/* Contact Info */}
            <div className="pt-2 border-t text-xs text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-1">
                <Phone className="h-3 w-3" />
                <span>+54 9 223 489-0963</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
