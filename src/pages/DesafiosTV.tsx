import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Medal, Sparkles, Star } from "lucide-react";
import confetti from "canvas-confetti";

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
  const confettiTriggeredRef = useRef<Set<string>>(new Set());

  const lanzarConfeti = (duracion: number = 3000) => {
    const end = Date.now() + duracion;
    
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

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
    loadDesafiosConRanking();
    lanzarConfetiCampeones(); // Confeti inicial al cargar
    const interval = setInterval(loadDesafiosConRanking, 30000);
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
            empleados!participaciones_empleado_id_fkey (
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

        // Lanzar confeti para campeones (100%)
        ranking.forEach((participante) => {
          const key = `${desafio.id}-${participante.empleado_id}`;
          if (participante.progreso >= 100 && !confettiTriggeredRef.current.has(key)) {
            confettiTriggeredRef.current.add(key);
            setTimeout(() => lanzarConfeti(2000), Math.random() * 1000);
          }
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8 relative overflow-hidden">
      {/* Estrellas decorativas de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-primary/20 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 20 + 10}px`,
              height: `${Math.random() * 20 + 10}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="text-center mb-12 animate-fade-in relative z-10">
        <div className="flex items-center justify-center gap-4 mb-6">
          <Trophy className="h-16 w-16 text-primary animate-bounce" style={{ animationDuration: '2s' }} />
          <div className="relative">
            <h1 className="text-6xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
              🎯 DESAFÍOS ACTIVOS 🏆
            </h1>
            <Sparkles className="absolute -top-6 -right-6 h-8 w-8 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <Target className="h-16 w-16 text-secondary animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
        </div>
        <p className="text-2xl font-semibold text-primary animate-pulse">¡Compite, Destaca y Alcanza la Cima! 🌟</p>
      </div>

      {/* Grid de Desafíos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto relative z-10">
        {desafiosConRanking.map((item, index) => (
          <Card 
            key={item.desafio.id}
            className="overflow-hidden border-4 border-primary/30 hover:border-primary transition-all duration-500 hover:shadow-2xl hover:shadow-primary/50 animate-fade-in relative group"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {/* Efecto brillo en hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <CardHeader className="bg-gradient-to-r from-primary/20 to-secondary/20 pb-4 relative overflow-hidden">
              {/* Decoración de estrellas */}
              <Sparkles className="absolute top-2 right-2 h-6 w-6 text-yellow-500/50 animate-pulse" />
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2 font-black flex items-center gap-2">
                    <Trophy className="h-7 w-7 text-primary animate-pulse" />
                    {item.desafio.titulo}
                  </CardTitle>
                  <p className="text-base text-muted-foreground line-clamp-2 font-medium">
                    {item.desafio.descripcion}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2 text-sm px-3 py-1 font-bold shadow-lg">
                  📅 {new Date(item.desafio.fecha_fin).toLocaleDateString()}
                </Badge>
              </div>
              
              {/* Progreso Total */}
              <div className="mt-5 space-y-3 bg-background/50 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex justify-between text-base items-center">
                  <span className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Progreso General
                  </span>
                  <span className="font-black text-xl text-primary">{Math.round(item.progresoTotal)}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={item.progresoTotal} 
                    className="h-4 animate-scale-in shadow-lg"
                  />
                  {item.progresoTotal >= 80 && (
                    <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500 animate-spin" style={{ animationDuration: '2s' }} />
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 bg-gradient-to-b from-transparent to-primary/5">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-primary">
                <Trophy className="h-7 w-7 animate-bounce" />
                🏆 TOP CAMPEONES 🏆
              </h3>

              <div className="space-y-5">
                {item.ranking.map((participante) => (
                  <div
                    key={participante.empleado_id}
                    className={`group relative p-5 rounded-xl transition-all duration-500 hover:scale-105 animate-fade-in shadow-lg ${
                      participante.posicion === 1 
                        ? 'bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border-4 border-yellow-500/50 hover:shadow-yellow-500/50' 
                        : participante.posicion === 2
                        ? 'bg-gradient-to-r from-gray-400/20 via-gray-300/10 to-gray-400/20 border-4 border-gray-400/50 hover:shadow-gray-400/50'
                        : participante.posicion === 3
                        ? 'bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20 border-4 border-amber-600/50 hover:shadow-amber-600/50'
                        : 'bg-gradient-to-r from-background to-muted/30 border-2 border-muted hover:border-primary/50 hover:shadow-primary/30'
                    } hover:shadow-2xl`}
                    style={{ animationDelay: `${participante.posicion * 100}ms` }}
                  >
                    <div className="flex items-center gap-5">
                      {/* Posición y Medalla */}
                      <div className="flex flex-col items-center gap-2 min-w-[50px]">
                        <span className="text-4xl font-black bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                          #{participante.posicion}
                        </span>
                        {getMedalIcon(participante.posicion)}
                      </div>

                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="h-20 w-20 border-4 border-primary/30 group-hover:border-primary transition-all duration-500 group-hover:scale-125 shadow-xl group-hover:shadow-2xl">
                          <AvatarImage 
                            src={participante.avatar_url} 
                            alt={`${participante.nombre} ${participante.apellido}`}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-primary/30 to-secondary/30">
                            {participante.nombre.charAt(0)}{participante.apellido.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {participante.progreso >= 100 && (
                          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 animate-spin" />
                        )}
                      </div>

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-2xl truncate group-hover:text-primary transition-colors flex items-center gap-2">
                          {participante.nombre} {participante.apellido}
                          {participante.progreso >= 100 && <span className="text-2xl">🎉</span>}
                        </p>
                        
                        {/* Barra de Progreso */}
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-base items-center">
                            <span className="font-semibold text-muted-foreground">Progreso</span>
                            <span className="font-black text-2xl text-primary flex items-center gap-1">
                              {Math.round(participante.progreso)}%
                              {participante.progreso >= 100 && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 animate-spin" />}
                            </span>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={participante.progreso}
                              className="h-4 overflow-hidden shadow-lg"
                            />
                            {participante.progreso >= 100 && (
                              <Trophy className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500 animate-bounce" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Efectos especiales al completar */}
                    {participante.progreso >= 100 && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-yellow-400/30 to-yellow-500/20 rounded-xl animate-pulse pointer-events-none" />
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/50 via-transparent to-yellow-500/50 rounded-xl blur-sm animate-pulse pointer-events-none" />
                        <Sparkles className="absolute top-2 left-2 h-6 w-6 text-yellow-500 animate-pulse" />
                        <Star className="absolute bottom-2 right-2 h-6 w-6 text-yellow-500 fill-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
                      </>
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
