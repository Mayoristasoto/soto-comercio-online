import { Gondola } from "@/pages/Gondolas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Tag, Building, Calendar, MessageCircle } from "lucide-react";

interface GondolaTooltipProps {
  gondola: Gondola;
  position: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const GondolaTooltip = ({ gondola, position, onMouseEnter, onMouseLeave }: GondolaTooltipProps) => {
  // Detectar si está en mobile y ajustar posición
  const isMobile = window.innerWidth <= 768;
  
  // Calcular posición para evitar que se salga de la pantalla
  const tooltipWidth = 280;
  const tooltipHeight = 160;
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
  
  return (
    <div
      className="fixed z-50"
      style={{
        left: left,
        top: top,
        transform: isMobile ? 'none' : 'translateY(-100%)'
      }}
    >
      <Card 
        className={`shadow-lg border-2 ${isMobile ? 'w-72' : 'w-64'}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {gondola.section}
              </h3>
              <Badge 
                variant={gondola.status === 'occupied' ? 'destructive' : 'default'}
                className={gondola.status === 'available' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                {gondola.status === 'occupied' ? 'Ocupada' : 'Disponible'}
              </Badge>
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

            {gondola.brand && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{gondola.brand}</span>
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
                <a 
                  href={`https://wa.me/5492234890963?text=Hola quiero solicitar el espacio de la ${gondola.type} ${gondola.section}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full pointer-events-auto"
                >
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Solicitar este espacio
                  </Button>
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};