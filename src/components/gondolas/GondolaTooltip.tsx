import { Gondola } from "@/pages/Gondolas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Tag, Building, Calendar } from "lucide-react";

interface GondolaTooltipProps {
  gondola: Gondola;
  position: { x: number; y: number };
}

export const GondolaTooltip = ({ gondola, position }: GondolaTooltipProps) => {
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <Card className="w-64 shadow-lg border-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};