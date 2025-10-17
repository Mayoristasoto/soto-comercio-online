import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Medal } from "lucide-react";

interface Desafio {
  id: string;
  titulo: string;
  descripcion: string;
  objetivos: any;
  fecha_fin: string;
}

interface ParticipanteRanking {
  empleado_id: string;
  nombre: string;
  apellido: string;
  avatar_url: string;
  progreso: number;
  posicion: number;
}

interface DesafioConRanking {
  desafio: Desafio;
  ranking: ParticipanteRanking[];
  progresoTotal: number;
}

export default function DesafiosTV() {
  const [desafiosConRanking, setDesafiosConRanking] = useState<DesafioConRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesafiosConRanking();
    const interval = setInterval(loadDesafiosConRanking, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadDesafiosConRanking = async () => {
    try {
      // Obtener desafíos activos
      const { data: desafios, error: desafiosError } = await supabase
        .from("desafios")
        .select("*")
        .eq("estado", "activo")
        .order("fecha_fin", { ascending: true });

      if (desafiosError) throw desafiosError;

      const desafiosData: DesafioConRanking[] = [];

      for (const desafio of desafios || []) {
        // Obtener participaciones del desafío
        const { data: participaciones, error: partError } = await supabase
          .from("participaciones")
          .select(`
            empleado_id,
            progreso,
            empleados (
              nombre,
              apellido,
              avatar_url
            )
          `)
          .eq("desafio_id", desafio.id)
          .order("progreso", { ascending: false })
          .limit(5);

        if (partError) throw partError;

        const ranking: ParticipanteRanking[] = (participaciones || []).map((p: any, index) => ({
          empleado_id: p.empleado_id,
          nombre: p.empleados?.nombre || "N/A",
          apellido: p.empleados?.apellido || "",
          avatar_url: p.empleados?.avatar_url || "",
          progreso: p.progreso || 0,
          posicion: index + 1,
        }));

        // Calcular progreso total (promedio de todos los participantes)
        const progresoTotal = ranking.length > 0
          ? ranking.reduce((acc, r) => acc + r.progreso, 0) / ranking.length
          : 0;

        desafiosData.push({
          desafio,
          ranking,
          progresoTotal,
        });
      }

      setDesafiosConRanking(desafiosData);
    } catch (error) {
      console.error("Error cargando desafíos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (posicion: number) => {
    switch (posicion) {
      case 1: return "text-yellow-500";
      case 2: return "text-gray-400";
      case 3: return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  const getMedalIcon = (posicion: number) => {
    if (posicion <= 3) {
      return <Medal className={`h-6 w-6 ${getMedalColor(posicion)} animate-pulse`} />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="h-16 w-16 text-primary mx-auto animate-bounce" />
          <p className="text-xl text-muted-foreground">Cargando desafíos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-8">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="h-12 w-12 text-primary animate-scale-in" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Desafíos Activos
          </h1>
          <Target className="h-12 w-12 text-secondary animate-scale-in" />
        </div>
        <p className="text-xl text-muted-foreground">¡Compite y alcanza la cima!</p>
      </div>

      {/* Grid de Desafíos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {desafiosConRanking.map((item, index) => (
          <Card 
            key={item.desafio.id}
            className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl animate-fade-in"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{item.desafio.titulo}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.desafio.descripcion}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {new Date(item.desafio.fecha_fin).toLocaleDateString()}
                </Badge>
              </div>
              
              {/* Progreso Total */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso General</span>
                  <span className="font-semibold">{Math.round(item.progresoTotal)}%</span>
                </div>
                <Progress 
                  value={item.progresoTotal} 
                  className="h-3 animate-scale-in"
                />
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top Participantes
              </h3>

              <div className="space-y-4">
                {item.ranking.map((participante) => (
                  <div
                    key={participante.empleado_id}
                    className="group relative p-4 rounded-lg bg-gradient-to-r from-background to-muted/30 hover:from-primary/5 hover:to-secondary/5 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in"
                    style={{ animationDelay: `${participante.posicion * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Posición y Medalla */}
                      <div className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {participante.posicion}
                        </span>
                        {getMedalIcon(participante.posicion)}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-16 w-16 border-2 border-primary/20 group-hover:border-primary transition-all duration-300 group-hover:scale-110">
                        <AvatarImage 
                          src={participante.avatar_url} 
                          alt={`${participante.nombre} ${participante.apellido}`}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-secondary/20">
                          {participante.nombre.charAt(0)}{participante.apellido.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {participante.nombre} {participante.apellido}
                        </p>
                        
                        {/* Barra de Progreso */}
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-semibold text-primary">
                              {Math.round(participante.progreso)}%
                            </span>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={participante.progreso}
                              className="h-2.5 overflow-hidden"
                            />
                            {participante.progreso >= 100 && (
                              <Trophy className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500 animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Efecto de brillo al completar */}
                    {participante.progreso >= 100 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-yellow-400/20 to-yellow-500/10 rounded-lg animate-pulse pointer-events-none" />
                    )}
                  </div>
                ))}

                {item.ranking.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay participantes aún</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {desafiosConRanking.length === 0 && (
        <div className="text-center py-16">
          <Trophy className="h-24 w-24 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-2xl text-muted-foreground">No hay desafíos activos en este momento</p>
        </div>
      )}
    </div>
  );
}
