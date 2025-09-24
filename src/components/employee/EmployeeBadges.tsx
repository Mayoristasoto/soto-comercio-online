import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Award, Trophy, Star, Medal, Calendar } from "lucide-react";

interface InsigniaObtenida {
  id: string;
  fecha_otorgada: string;
  insignia: {
    nombre: string;
    descripcion: string;
    icono: string;
    puntos_valor: number;
  } | null;
}

interface Props {
  empleadoId: string;
}

export function EmployeeBadges({ empleadoId }: Props) {
  const [insignias, setInsignias] = useState<InsigniaObtenida[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (empleadoId) {
      loadInsignias();
    }
  }, [empleadoId]);

  const loadInsignias = async () => {
    setLoading(true);
    try {
      // Load employee badges
      const { data: insigniasEmpleado, error } = await supabase
        .from('insignias_empleado')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('fecha_otorgada', { ascending: false });

      if (error) throw error;

      // Load badge details for each earned badge
      const insigniasWithDetails = await Promise.all(
        (insigniasEmpleado || []).map(async (insigniaEmp) => {
          const { data: insignia } = await supabase
            .from('insignias')
            .select('nombre, descripcion, icono, puntos_valor')
            .eq('id', insigniaEmp.insignia_id)
            .eq('activa', true)
            .maybeSingle();

          return {
            ...insigniaEmp,
            insignia: insignia || null
          };
        })
      );

      setInsignias(insigniasWithDetails);
    } catch (error) {
      console.error('Error loading insignias:', error);
      toast({
        title: "Error",
        description: "Error al cargar medallas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'trophy':
        return Trophy;
      case 'star':
        return Star;
      case 'medal':
        return Medal;
      case 'award':
        return Award;
      default:
        return Award;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-muted-foreground">Cargando medallas...</p>
      </div>
    );
  }

  if (insignias.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Aún no tienes medallas</p>
        <p className="text-sm">
          Completa tareas y desafíos para ganar tus primeras medallas
        </p>
      </div>
    );
  }

  const totalPuntos = insignias.reduce((sum, ins) => sum + (ins.insignia?.puntos_valor || 0), 0);

  return (
    <div className="space-y-4">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-center p-2 bg-yellow-100 rounded">
          <div className="font-bold text-lg text-yellow-600">{insignias.length}</div>
          <div className="text-muted-foreground">Medallas</div>
        </div>
        <div className="text-center p-2 bg-blue-100 rounded">
          <div className="font-bold text-lg text-blue-600">{totalPuntos}</div>
          <div className="text-muted-foreground">Puntos</div>
        </div>
      </div>

      {/* Medallas recientes */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-yellow-600 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Medallas Obtenidas
        </h4>
        
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {insignias.map((insignia) => {
            const IconComponent = getIconComponent(insignia.insignia?.icono || 'award');
            
            return (
              <div key={insignia.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {insignia.insignia?.nombre || 'Medalla'}
                    </span>
                    {insignia.insignia?.puntos_valor && (
                      <Badge variant="secondary" className="text-xs">
                        +{insignia.insignia.puntos_valor} pts
                      </Badge>
                    )}
                  </div>
                  
                  {insignia.insignia?.descripcion && (
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                      {insignia.insignia.descripcion}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Obtenida: {new Date(insignia.fecha_otorgada).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {insignias.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Mostrando todas tus {insignias.length} medallas obtenidas
          </p>
        )}
      </div>

      {/* Mensaje motivacional */}
      <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
        <p className="text-sm text-yellow-700">
          🎉 ¡Excelente trabajo! Sigue participando en desafíos para ganar más medallas
        </p>
      </div>
    </div>
  );
}