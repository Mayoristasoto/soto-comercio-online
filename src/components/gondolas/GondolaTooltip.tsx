import React, { useState, useRef, useEffect } from 'react';
import { Gondola } from "@/pages/Gondolas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Tag, Building, Calendar, MessageCircle, X, Star } from "lucide-react";

interface GondolaTooltipProps {
  gondola: Gondola;
  position: { x: number; y: number };
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const GondolaTooltip = ({ gondola, position, onClose, onMouseEnter, onMouseLeave }: GondolaTooltipProps) => {
  const [isFixed, setIsFixed] = useState(false);
  const [fixedPosition, setFixedPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Detectar si está en mobile y ajustar posición
  const isMobile = window.innerWidth <= 768;
  
  // Fijar posición cuando se muestra por primera vez
  useEffect(() => {
    if (!isFixed) {
      const tooltipWidth = 320;
      const tooltipHeight = 280;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      let left = position.x + 10;
      let top = position.y - 10;
      
      // Ajustar para que no se salga por la derecha
      if (left + tooltipWidth > screenWidth) {
        left = position.x - tooltipWidth - 10;
      }
      
      // Ajustar para que no se salga por arriba
      if (top - tooltipHeight < 0) {
        top = position.y + 20;
      }
      
      // En móvil, centrar el tooltip
      if (isMobile) {
        left = (screenWidth - tooltipWidth) / 2;
        top = Math.max(20, Math.min(top, screenHeight - tooltipHeight - 20));
      }
      
      setFixedPosition({ x: left, y: top });
      setIsFixed(true);
    }
  }, [position, isFixed, isMobile]);
  
  const handleWhatsApp = () => {
    const message = `Hola! Me interesa consultar sobre el espacio ${gondola.section} (${gondola.type === 'gondola' ? 'Góndola' : 'Puntera'}) en Mayorista Soto.`;
    const url = `https://wa.me/5492234890963?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };
  
  return (
    <div
      ref={tooltipRef}
      className="fixed z-[60] pointer-events-auto"
      style={{
        left: fixedPosition.x,
        top: fixedPosition.y,
        transform: isMobile ? 'none' : 'translateY(-20px)'
      }}
      onMouseEnter={() => {
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        onMouseLeave?.();
      }}
    >
      <Card className={`shadow-xl border-2 bg-background pointer-events-auto ${isMobile ? 'w-80' : 'w-72'}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Espacio {gondola.section}
              </h3>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={gondola.status === 'occupied' ? 'destructive' : 'default'}
                  className={gondola.status === 'available' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  {gondola.status === 'occupied' ? 'Ocupada' : 'Disponible'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize font-medium">
                {gondola.type === 'gondola' ? 'Góndola' : 'Puntera'}
              </span>
            </div>

            {/* Imagen si existe */}
            {gondola.image_url && (
              <div className="mt-2 mb-2">
                <img
                  src={gondola.image_url}
                  alt={`Imagen de ${gondola.section}`}
                  className="w-full h-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Información de marca */}
            {gondola.brand && gondola.status === 'occupied' && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{gondola.brand}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>{gondola.category}</span>
            </div>

            {/* Fecha de fin si existe */}
            {gondola.status === 'occupied' && gondola.endDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">
                  Hasta: {new Date(gondola.endDate).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}

            {/* Llamada a la acción para espacios disponibles */}
            {gondola.status === 'available' && (
              <div className="mt-3 pt-3 border-t">
                <Button 
                  size="sm" 
                  className="w-full bg-green-600 hover:bg-green-700 text-sm pointer-events-auto"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Solicitar este espacio
                </Button>
              </div>
            )}

            {/* Botón de consulta para espacios ocupados */}
            {gondola.status === 'occupied' && (
              <div className="mt-3 pt-3 border-t">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full text-sm pointer-events-auto"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Consultar disponibilidad
                </Button>
              </div>
            )}

            {/* Info de contacto */}
            <div className="mt-3 pt-2 border-t text-center text-xs text-muted-foreground">
              <div>📞 +54 9 223 489-0963</div>
              <div>📍 Fortunato de la Plaza 4798</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};