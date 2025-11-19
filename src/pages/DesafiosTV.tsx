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

interface SucursalRanking {
  sucursal_id: string;
  sucursal_nombre: string;
  rankings: RankingData[];
}

export default function DesafiosTV() {
  const [sucursalesRanking, setSucursalesRanking] = useState<SucursalRanking[]>([]);
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
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
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
      const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];

      const { data: participantes } = await supabase.from('desafios_tv_participantes').select('empleado_id').eq('participa', true);
      const empleadosPermitidosIds = new Set(participantes?.map(p => p.empleado_id) || []);
      const { data: sucursales } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
      
      // Obtener fichajes tardíos desde inicio de semana
      const { data: fichajesTardios } = await supabase
        .from('fichajes_tardios')
        .select('empleado_id, empleados!fichajes_tardios_empleado_id_fkey(nombre, apellido, avatar_url, sucursal_id)')
        .gte('fecha_fichaje', inicioSemanaStr);

      // Obtener pausas excedidas desde inicio de semana
      const { data: pausasExcedidas } = await supabase
        .from('fichajes_pausas_excedidas')
        .select('empleado_id, empleados!fichajes_pausas_excedidas_empleado_id_fkey(nombre, apellido, avatar_url, sucursal_id)')
        .gte('fecha_fichaje', inicioSemanaStr);

      const empleadosPorSucursal = new Map<string, Map<string, any>>();
      
      // Procesar fichajes tardíos
      fichajesTardios?.forEach((fichaje: any) => {
        const sucursalId = fichaje.empleados?.sucursal_id;
        if (!sucursalId || !(participantes?.length === 0 || empleadosPermitidosIds.has(fichaje.empleado_id))) return;
        if (!empleadosPorSucursal.has(sucursalId)) empleadosPorSucursal.set(sucursalId, new Map());
        const sucursalMap = empleadosPorSucursal.get(sucursalId)!;
        if (!sucursalMap.has(fichaje.empleado_id)) {
          sucursalMap.set(fichaje.empleado_id, { 
            empleado_id: fichaje.empleado_id, 
            nombre: fichaje.empleados?.nombre || '', 
            apellido: fichaje.empleados?.apellido || '', 
            avatar_url: fichaje.empleados?.avatar_url || '', 
            llegadas_tarde: 0, 
            pausas_excedidas: 0 
          });
        }
        const emp = sucursalMap.get(fichaje.empleado_id);
        emp.llegadas_tarde++;
      });

      // Procesar pausas excedidas
      pausasExcedidas?.forEach((pausa: any) => {
        const sucursalId = pausa.empleados?.sucursal_id;
        if (!sucursalId || !(participantes?.length === 0 || empleadosPermitidosIds.has(pausa.empleado_id))) return;
        if (!empleadosPorSucursal.has(sucursalId)) empleadosPorSucursal.set(sucursalId, new Map());
        const sucursalMap = empleadosPorSucursal.get(sucursalId)!;
        if (!sucursalMap.has(pausa.empleado_id)) {
          sucursalMap.set(pausa.empleado_id, { 
            empleado_id: pausa.empleado_id, 
            nombre: pausa.empleados?.nombre || '', 
            apellido: pausa.empleados?.apellido || '', 
            avatar_url: pausa.empleados?.avatar_url || '', 
            llegadas_tarde: 0, 
            pausas_excedidas: 0 
          });
        }
        const emp = sucursalMap.get(pausa.empleado_id);
        emp.pausas_excedidas++;
      });

      const { data: todosEmpleados } = await supabase.from('empleados').select('id, nombre, apellido, avatar_url, sucursal_id').eq('activo', true);
      todosEmpleados?.forEach((emp: any) => {
        if (!emp.sucursal_id || !(participantes?.length === 0 || empleadosPermitidosIds.has(emp.id))) return;
        if (!empleadosPorSucursal.has(emp.sucursal_id)) empleadosPorSucursal.set(emp.sucursal_id, new Map());
        const sucursalMap = empleadosPorSucursal.get(emp.sucursal_id)!;
        if (!sucursalMap.has(emp.id)) sucursalMap.set(emp.id, { empleado_id: emp.id, nombre: emp.nombre, apellido: emp.apellido, avatar_url: emp.avatar_url, llegadas_tarde: 0, pausas_excedidas: 0 });
      });

      const sucursalesRankingData: SucursalRanking[] = [];
      sucursales?.forEach(sucursal => {
        const empleadosMap = empleadosPorSucursal.get(sucursal.id);
        if (!empleadosMap || empleadosMap.size === 0) return;
        const empleadosArray = Array.from(empleadosMap.values());
        sucursalesRankingData.push({
          sucursal_id: sucursal.id,
          sucursal_nombre: sucursal.nombre,
          rankings: [
            { titulo: '🏆 Top 10 Más Puntuales', tipo: 'puntualidad', ranking: empleadosArray.sort((a, b) => a.llegadas_tarde - b.llegadas_tarde).slice(0, 10).map((emp, index) => ({ empleado_id: emp.empleado_id, nombre: emp.nombre, apellido: emp.apellido, avatar_url: emp.avatar_url, puntuacion: emp.llegadas_tarde, posicion: index + 1, detalle: emp.llegadas_tarde === 0 ? '¡Perfecto!' : `${emp.llegadas_tarde} ${emp.llegadas_tarde === 1 ? 'llegada tarde' : 'llegadas tarde'}` })) },
            { titulo: '⏰ Top 10 Descansos Controlados', tipo: 'descanso', ranking: empleadosArray.sort((a, b) => a.pausas_excedidas - b.pausas_excedidas).slice(0, 10).map((emp, index) => ({ empleado_id: emp.empleado_id, nombre: emp.nombre, apellido: emp.apellido, avatar_url: emp.avatar_url, puntuacion: emp.pausas_excedidas, posicion: index + 1, detalle: emp.pausas_excedidas === 0 ? '¡Excelente!' : `${emp.pausas_excedidas} ${emp.pausas_excedidas === 1 ? 'pausa excedida' : 'pausas excedidas'}` })) }
          ]
        });
      });
      setSucursalesRanking(sucursalesRankingData);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const getPodiumIcon = (pos: number) => pos === 1 ? <Trophy className="w-8 h-8 text-yellow-400" /> : pos === 2 ? <Medal className="w-7 h-7 text-gray-400" /> : pos === 3 ? <Medal className="w-6 h-6 text-amber-600" /> : <Star className="w-5 h-5 text-muted-foreground" />;
  const getPodiumBadgeVariant = (pos: number): "default" | "secondary" | "outline" => pos === 1 ? "default" : pos === 2 ? "secondary" : "outline";

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center"><div className="animate-pulse text-2xl text-muted-foreground">Cargando rankings...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">Rankings de Desempeño</h1>
          <p className="text-2xl text-muted-foreground">Semana Actual - {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {sucursalesRanking.map((sucursalData) => (
          <div key={sucursalData.sucursal_id} className="space-y-6">
            <div className="text-center"><h2 className="text-4xl font-bold text-primary">📍 {sucursalData.sucursal_nombre}</h2></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {sucursalData.rankings.map((ranking, idx) => (
                <Card key={idx} className="overflow-hidden border-2 hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-4">
                    <CardTitle className="flex items-center justify-center gap-3 text-3xl"><Sparkles className="w-8 h-8 text-primary animate-pulse" />{ranking.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {ranking.ranking.map((p) => (
                        <div key={p.empleado_id} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-105 ${p.posicion <= 3 ? 'bg-gradient-to-r from-primary/20 to-secondary/20 shadow-lg' : 'bg-muted/50 hover:bg-muted'}`}>
                          <div className="flex-shrink-0 w-16 flex flex-col items-center">{getPodiumIcon(p.posicion)}<Badge variant={getPodiumBadgeVariant(p.posicion)} className="mt-1 text-lg font-bold">#{p.posicion}</Badge></div>
                          <Avatar className="w-16 h-16 border-2 border-primary shadow-md"><AvatarImage src={p.avatar_url || undefined} /><AvatarFallback className="text-lg font-semibold">{p.nombre[0]}{p.apellido[0]}</AvatarFallback></Avatar>
                          <div className="flex-1"><h3 className="text-xl font-bold">{p.nombre} {p.apellido}</h3><p className="text-muted-foreground">{p.detalle}</p></div>
                          {p.posicion === 1 && <div className="flex-shrink-0"><div className="animate-bounce"><Trophy className="w-10 h-10 text-yellow-400" /></div></div>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
