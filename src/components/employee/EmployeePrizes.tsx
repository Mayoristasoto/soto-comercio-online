import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Gift, Coins, ShoppingCart, Star, AlertCircle, CheckCircle } from "lucide-react";

interface Premio {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  monto_presupuestado: number;
  stock: number | null;
  activo: boolean;
  criterios_eligibilidad: any;
  participantes: any;
}

interface Props {
  empleadoId: string;
  userPoints: number;
  onPointsUpdate: () => void;
}

export function EmployeePrizes({ empleadoId, userPoints, onPointsUpdate }: Props) {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPremio, setSelectedPremio] = useState<Premio | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [canjeando, setCanjeando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPremios();
  }, []);

  const loadPremios = async () => {
    setLoading(true);
    try {
      const { data: premios, error } = await supabase
        .from('premios')
        .select('*')
        .eq('activo', true)
        .order('monto_presupuestado', { ascending: true });

      if (error) throw error;
      setPremios(premios || []);
    } catch (error) {
      console.error('Error loading premios:', error);
      toast({
        title: "Error",
        description: "Error al cargar premios disponibles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canCanjear = (premio: Premio) => {
    return userPoints >= premio.monto_presupuestado && 
           (premio.stock === null || premio.stock > 0);
  };

  const handleCanje = async (premio: Premio) => {
    if (!canCanjear(premio)) {
      toast({
        title: "Puntos insuficientes",
        description: `Necesitas ${premio.monto_presupuestado} puntos para canjear este premio. Tienes ${userPoints} puntos.`,
        variant: "destructive"
      });
      return;
    }

    setCanjeando(true);
    try {
      // Verificar que el usuario tenga suficientes puntos actualizados
      const { data: puntosActuales } = await supabase
        .from('puntos')
        .select('puntos')
        .eq('empleado_id', empleadoId);
      
      const totalPuntosActuales = puntosActuales?.reduce((sum, p) => sum + p.puntos, 0) || 0;
      
      if (totalPuntosActuales < premio.monto_presupuestado) {
        toast({
          title: "Puntos insuficientes",
          description: `Tus puntos actuales (${totalPuntosActuales}) no son suficientes para canjear este premio.`,
          variant: "destructive"
        });
        return;
      }

      // Crear la asignación del premio
      const { error: asignacionError } = await supabase
        .from('asignaciones_premio')
        .insert([{
          premio_id: premio.id,
          beneficiario_tipo: 'empleado',
          beneficiario_id: empleadoId,
          estado: 'pendiente',
          costo_real: premio.monto_presupuestado
        }]);

      if (asignacionError) {
        console.error('Error creando asignación:', asignacionError);
        throw new Error('No se pudo crear la asignación del premio');
      }

      // Deducir puntos del empleado
      const { error: puntosError } = await supabase
        .from('puntos')
        .insert([{
          empleado_id: empleadoId,
          puntos: -premio.monto_presupuestado,
          motivo: `Canje por premio: ${premio.nombre}`
        }]);

      if (puntosError) {
        console.error('Error deduciendo puntos:', puntosError);
        throw new Error('No se pudieron deducir los puntos');
      }

      // Actualizar stock si aplica
      if (premio.stock !== null && premio.stock > 0) {
        const { error: stockError } = await supabase
          .from('premios')
          .update({ stock: premio.stock - 1 })
          .eq('id', premio.id);

        if (stockError) {
          console.error('Error actualizando stock:', stockError);
          // No bloquear el canje por error de stock
        }
      }

      toast({
        title: "¡Canje exitoso!",
        description: `Has canjeado ${premio.monto_presupuestado} puntos por "${premio.nombre}". El premio estará disponible pronto.`
      });

      setDialogOpen(false);
      onPointsUpdate(); // Actualizar puntos en el dashboard
      loadPremios(); // Recargar premios para actualizar stock
    } catch (error) {
      console.error('Error en canje:', error);
      toast({
        title: "Error en el canje",
        description: error instanceof Error ? error.message : "No se pudo completar el canje. Inténtalo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setCanjeando(false);
    }
  };

  const openPremio = (premio: Premio) => {
    setSelectedPremio(premio);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-muted-foreground">Cargando premios...</p>
      </div>
    );
  }

  const premiosDisponibles = premios.filter(p => canCanjear(p));
  const premiosNoDisponibles = premios.filter(p => !canCanjear(p));

  return (
    <div className="space-y-4">
      {/* Puntos disponibles */}
      <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Coins className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-lg text-blue-600">{userPoints}</span>
          <span className="text-sm text-muted-foreground">puntos disponibles</span>
        </div>
        <p className="text-xs text-blue-700">
          Canjea tus puntos por increíbles premios
        </p>
      </div>

      {premios.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay premios disponibles</p>
          <p className="text-sm">Los premios aparecerán aquí cuando estén disponibles</p>
        </div>
      )}

      {/* Premios disponibles */}
      {premiosDisponibles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Puedes canjear ({premiosDisponibles.length})
          </h4>
          
          <div className="grid grid-cols-1 gap-2">
            {premiosDisponibles.map((premio) => (
              <div key={premio.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{premio.nombre}</span>
                    <Badge variant="outline" className="text-xs">
                      {premio.monto_presupuestado} pts
                    </Badge>
                    {premio.stock !== null && (
                      <Badge variant="secondary" className="text-xs">
                        Stock: {premio.stock}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {premio.descripcion || 'Sin descripción'}
                  </p>
                </div>
                <Button size="sm" onClick={() => openPremio(premio)}>
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Canjear
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premios no disponibles */}
      {premiosNoDisponibles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-orange-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Necesitas más puntos ({premiosNoDisponibles.length})
          </h4>
          
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {premiosNoDisponibles.slice(0, 3).map((premio) => (
              <div key={premio.id} className="flex items-center justify-between p-2 border rounded-lg bg-orange-50 opacity-75">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{premio.nombre}</span>
                    <Badge variant="outline" className="text-xs">
                      {premio.monto_presupuestado} pts
                    </Badge>
                  </div>
                  <p className="text-xs text-orange-600">
                    Te faltan {premio.monto_presupuestado - userPoints} puntos
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled>
                  <Star className="h-3 w-3 mr-1" />
                  Próximamente
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog para confirmar canje */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Confirmar Canje
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres canjear este premio?
            </DialogDescription>
          </DialogHeader>

          {selectedPremio && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-accent/50">
                <h3 className="font-medium mb-2">{selectedPremio.nombre}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedPremio.descripcion || 'Sin descripción disponible'}
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Costo:</span>
                    <div className="font-medium">{selectedPremio.monto_presupuestado} puntos</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tus puntos:</span>
                    <div className="font-medium">{userPoints} puntos</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quedarán:</span>
                    <div className="font-medium">{userPoints - selectedPremio.monto_presupuestado} puntos</div>
                  </div>
                  {selectedPremio.stock !== null && (
                    <div>
                      <span className="text-muted-foreground">Stock:</span>
                      <div className="font-medium">{selectedPremio.stock} disponibles</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={canjeando}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => selectedPremio && handleCanje(selectedPremio)}
                  disabled={canjeando || !canCanjear(selectedPremio)}
                  className="min-w-24"
                >
                  {canjeando ? (
                    "Canjeando..."
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Confirmar Canje
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}