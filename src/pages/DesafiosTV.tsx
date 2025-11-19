import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Sparkles, Star } from "lucide-react";
import confetti from "canvas-confetti";

interface EmpleadoRanking {
  empleado_id: string;
  nombre: string;
  apellido: string;
  avatar_url: string;
  puntuacion: number;
  posicion: number;
  detalle: string;
}

interface RankingData {
  titulo: string;
  tipo: 'puntualidad' | 'descanso';
  ranking: EmpleadoRanking[];
}

export default function DesafiosTV() {
  const [rankingData, setRankingData] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const confettiTriggeredRef = useRef<Set<string>>(new Set());

  const lanzarConfetiCampeones = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  useEffect(() => {
    loadRankingData();
    lanzarConfetiCampeones();
    const interval = setInterval(loadRankingData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRankingData = async () => {
    try {
      setLoading(true);

      const inicioSemana = new Date();
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
      inicioSemana.setHours(0, 0, 0, 0);

      // Obtener empleados que participan en DesafíosTV
      const { data: participantes } = await supabase
        .from('desafios_tv_participantes')
        .select('empleado_id')
        .eq('participa', true);

      const empleadosPermitidosIds = new Set(
        participantes?.map(p => p.empleado_id) || []
      );

      const { data: crucesRojas, error: crucesError } = await supabase
        .from('empleado_cruces_rojas')
        .select(`
          empleado_id,
          tipo_infraccion,
          minutos_diferencia,
          empleados!empleado_cruces_rojas_empleado_id_fkey (
            nombre,
            apellido,
            avatar_url
          )
        `)
        .gte('fecha_infraccion', inicioSemana.toISOString())
        .eq('anulada', false);

      if (crucesError) throw crucesError;

      const empleadosMap = new Map();
      
      crucesRojas?.forEach((cruce: any) => {
        const key = cruce.empleado_id;
        
        // Filtrar por empleados permitidos si existe configuración
        const puedeParticipar = participantes?.length === 0 || empleadosPermitidosIds.has(key);
        if (!puedeParticipar) return;
        
        if (!empleadosMap.has(key)) {
          empleadosMap.set(key, {
            empleado_id: cruce.empleado_id,
            nombre: cruce.empleados?.nombre || '',
            apellido: cruce.empleados?.apellido || '',
            avatar_url: cruce.empleados?.avatar_url || '',
            llegadas_tarde: 0,
            pausas_excedidas: 0,
          });
        }
        
        const empleado = empleadosMap.get(key);
        if (cruce.tipo_infraccion === 'llegada_tarde') {
          empleado.llegadas_tarde++;
        } else if (cruce.tipo_infraccion === 'pausa_excedida') {
          empleado.pausas_excedidas++;
        }
      });

      const { data: todosEmpleados } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, avatar_url')
        .eq('activo', true);

      // Agregar empleados sin infracciones SOLO si participan en DesafíosTV
      todosEmpleados?.forEach((emp: any) => {
        // Si no hay configuración, por defecto participan todos
        // Si hay configuración, solo los que están permitidos
        const puedeParticipar = participantes?.length === 0 || empleadosPermitidosIds.has(emp.id);
        
        if (puedeParticipar && !empleadosMap.has(emp.id)) {
          empleadosMap.set(emp.id, {
            empleado_id: emp.id,
            nombre: emp.nombre,
            apellido: emp.apellido,
            avatar_url: emp.avatar_url,
            llegadas_tarde: 0,
            pausas_excedidas: 0,
          });
        }
      });

      const empleadosArray = Array.from(empleadosMap.values());

      const rankingPuntualidad = empleadosArray
        .sort((a, b) => a.llegadas_tarde - b.llegadas_tarde)
        .slice(0, 10)
        .map((emp, index) => ({
          empleado_id: emp.empleado_id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          puntuacion: emp.llegadas_tarde,
          posicion: index + 1,
          detalle: emp.llegadas_tarde === 0 
            ? '¡Perfecto!' 
            : `${emp.llegadas_tarde} ${emp.llegadas_tarde === 1 ? 'llegada tarde' : 'llegadas tarde'}`
        }));

      const rankingDescanso = empleadosArray
        .sort((a, b) => a.pausas_excedidas - b.pausas_excedidas)
        .slice(0, 10)
        .map((emp, index) => ({
          empleado_id: emp.empleado_id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          avatar_url: emp.avatar_url,
          puntuacion: emp.pausas_excedidas,
          posicion: index + 1,
          detalle: emp.pausas_excedidas === 0 
            ? '¡Excelente!' 
            : `${emp.pausas_excedidas} ${emp.pausas_excedidas === 1 ? 'pausa excedida' : 'pausas excedidas'}`
        }));

      setRankingData([
        {
          titulo: '🏆 Top 10 Más Puntuales',
          tipo: 'puntualidad',
          ranking: rankingPuntualidad
        },
        {
          titulo: '⏰ Top 10 Descansos Controlados',
          tipo: 'descanso',
          ranking: rankingDescanso
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error("Error cargando ranking:", error);
      setLoading(false);
    }
  };

  const getPodiumIcon = (posicion: number) => {
    switch (posicion) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-400" />;
      case 2:
        return <Medal className="w-7 h-7 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPodiumBadgeVariant = (posicion: number): "default" | "secondary" | "outline" => {
    switch (posicion) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="animate-pulse text-2xl text-muted-foreground">
          Cargando rankings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Rankings de Desempeño
          </h1>
          <p className="text-2xl text-muted-foreground">
            Semana Actual - {new Date().toLocaleDateString('es-AR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {rankingData.map((ranking, idx) => (
            <Card 
              key={idx}
              className="overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 animate-slide-in"
              style={{ animationDelay: `${idx * 0.2}s` }}
            >
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-4">
                <CardTitle className="flex items-center justify-center gap-3 text-3xl">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  {ranking.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {ranking.ranking.map((participante) => (
                    <div
                      key={participante.empleado_id}
                      className={`
                        flex items-center gap-4 p-4 rounded-xl 
                        transition-all duration-300 hover:scale-105
                        ${participante.posicion <= 3 
                          ? 'bg-gradient-to-r from-primary/20 to-secondary/20 shadow-lg' 
                          : 'bg-muted/50 hover:bg-muted'
                        }
                      `}
                    >
                      <div className="flex-shrink-0 w-16 flex flex-col items-center">
                        {getPodiumIcon(participante.posicion)}
                        <Badge 
                          variant={getPodiumBadgeVariant(participante.posicion)}
                          className="mt-1 text-lg font-bold"
                        >
                          #{participante.posicion}
                        </Badge>
                      </div>

                      <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                        <AvatarImage src={participante.avatar_url} />
                        <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                          {participante.nombre[0]}{participante.apellido[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xl truncate">
                          {participante.nombre} {participante.apellido}
                        </p>
                        <p className={`text-sm ${
                          participante.puntuacion === 0 
                            ? 'text-green-600 dark:text-green-400 font-semibold' 
                            : 'text-muted-foreground'
                        }`}>
                          {participante.detalle}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className={`
                          text-3xl font-bold 
                          ${participante.puntuacion === 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-muted-foreground'
                          }
                        `}>
                          {participante.puntuacion}
                        </div>
                        {participante.puntuacion === 0 && (
                          <Badge variant="default" className="mt-1 bg-green-600">
                            Perfecto
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
