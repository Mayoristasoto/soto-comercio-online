import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, MessageCircle, Phone, Calendar, Store, X } from "lucide-react";
import { Gondola } from "@/pages/Gondolas";

interface MobileGondolaModalProps {
  gondola: Gondola | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSpace?: (gondola: Gondola) => void;
}

export const MobileGondolaModal: React.FC<MobileGondolaModalProps> = ({ 
  gondola, 
  isOpen,
  onClose, 
  onRequestSpace 
}) => {
  if (!gondola) return null;

  const getStatusColor = (status: 'available' | 'occupied') => {
    return status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (status: 'available' | 'occupied') => {
    return status === 'available' ? 'Disponible' : 'Ocupado';
  };

  const handleWhatsApp = () => {
    const message = `Hola! Me interesa consultar sobre el espacio ${gondola.section} (${
      gondola.type === 'gondola' ? 'Góndola' : 
      gondola.type === 'puntera' ? 'Puntera' :
      gondola.type === 'cartel_exterior' ? 'Cartel Exterior' :
      gondola.type === 'exhibidor_impulso' ? 'Exhibidor de Impulso' :
      'Espacio'
    }) en Mayorista Soto.`;
    const url = `https://wa.me/5492234890963?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleRequestSpace = () => {
    if (onRequestSpace && gondola.status === 'available') {
      onRequestSpace(gondola);
    } else {
      handleWhatsApp();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold">
            Espacio {gondola.section}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(gondola.status)}>
              {getStatusText(gondola.status)}
            </Badge>
            <Badge variant="outline">
              {gondola.type === 'gondola' ? 'Góndola' : 
               gondola.type === 'puntera' ? 'Puntera' :
               gondola.type === 'cartel_exterior' ? 'Cartel Exterior' :
               gondola.type === 'exhibidor_impulso' ? 'Exhibidor de Impulso' :
               'Espacio'}
            </Badge>
          </div>

          {/* Main Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Sección: <strong>{gondola.section}</strong></span>
            </div>
            
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Categoría: <strong>{gondola.category}</strong></span>
            </div>

            {gondola.brand && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Marca: <strong>{gondola.brand}</strong></span>
              </div>
            )}

            {gondola.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Fin de contrato: <strong>{new Date(gondola.endDate).toLocaleDateString()}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Image if available */}
          {gondola.image_url && (
            <div className="aspect-video w-full rounded-lg overflow-hidden">
              <img 
                src={gondola.image_url} 
                alt={`Imagen del espacio ${gondola.section}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {gondola.status === 'available' ? (
              <Button 
                onClick={handleRequestSpace}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Reservar Este Espacio
              </Button>
            ) : (
              <Button 
                onClick={handleWhatsApp}
                variant="outline"
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Consultar por WhatsApp
              </Button>
            )}
          </div>

          {/* Contact Info */}
          <div className="text-center space-y-1 pt-2 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>+54 9 223 489-0963</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Fortunato de la Plaza 4798 - Mar del Plata</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};