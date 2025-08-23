import React, { useState, useRef, useEffect } from 'react';
import { Gondola } from "@/pages/Gondolas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Tag, Building, Calendar, MessageCircle, X } from "lucide-react";

interface GondolaTooltipProps {
  gondola: Gondola;
  position: { x: number; y: number };
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const GondolaTooltip = ({ gondola, position, onClose, onMouseEnter, onMouseLeave }: GondolaTooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Detectar si está en mobile y ajustar posición
  const isMobile = window.innerWidth <= 768;
  
  // Mantener el tooltip abierto cuando está siendo usado
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (!isHovered) {
      // Solo cerrar después de un delay si no está siendo hovereado
      timeout = setTimeout(() => {
        onClose();
      }, 500);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isHovered, onClose]);
  
  // Calcular posición para evitar que se salga de la pantalla
  const tooltipWidth = 280;
  const tooltipHeight = 200;
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
        left: left,
        top: top,
        transform: isMobile ? 'none' : 'translateY(-100%)'
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave?.();
      }}
    >
      <Card className={`shadow-xl border-2 bg-background pointer-events-auto ${isMobile ? 'w-72' : 'w-64'}`}>
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {gondola.section}
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
              <span className="capitalize">{gondola.type}</span>
            </div>

            {/* Imagen si existe (solo para punteras) */}
            {gondola.type === 'puntera' && gondola.image_url && (
              <div className="mt-2 mb-2">
                <img
                  src={gondola.image_url}
                  alt={`Imagen de ${gondola.section}`}
                  className="w-full h-24 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Mostrar información de marca solo si está ocupado */}
            {gondola.status === 'occupied' && gondola.brand && gondola.brand !== 'Espacio Ocupado' && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{gondola.brand}</span>
              </div>
            )}

            {gondola.status === 'occupied' && gondola.brand === 'Espacio Ocupado' && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-orange-600">Espacio Ocupado</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>{gondola.category}</span>
            </div>

            {gondola.status === 'occupied' && gondola.endDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">Hasta: {new Date(gondola.endDate).toLocaleDateString('es-ES')}</span>
              </div>
            )}

            {/* Llamada a la acción para espacios disponibles */}
            {gondola.status === 'available' && (
              <div className="mt-3 pt-2 border-t">
                <Button 
                  size="sm" 
                  className="w-full bg-green-600 hover:bg-green-700 text-xs pointer-events-auto"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Solicitar este espacio
                </Button>
              </div>
            )}

            {/* Botón de consulta para espacios ocupados */}
            {gondola.status === 'occupied' && (
              <div className="mt-3 pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full text-xs pointer-events-auto"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Consultar disponibilidad
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};