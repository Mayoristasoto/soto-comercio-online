import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Package, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Entrega {
  id: string;
  tipo_elemento: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  estado: string;
  fecha_entrega: string;
  fecha_confirmacion: string | null;
  observaciones: string;
  firma_empleado: string | null;
}

export function HistorialEntregas() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selectedFirma, setSelectedFirma] = useState<string | null>(null);

  useEffect(() => {
    loadEntregas();
  }, []);

  const loadEntregas = async () => {
    const { data: empleado } = await supabase.rpc("get_current_empleado_full");
    if (!empleado || !empleado[0]) return;

    const { data, error } = await supabase
      .from("entregas_elementos")
      .select("*")
      .eq("empleado_id", empleado[0].id)
      .eq("estado", "confirmado")
      .order("fecha_confirmacion", { ascending: false });

    if (error) {
      toast.error("Error al cargar historial");
      return;
    }
    setEntregas(data || []);
  };

  return (
    <div className="space-y-4">
      {entregas.map((entrega) => (
        <Card key={entrega.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{entrega.tipo_elemento}</span>
                  <Badge className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Confirmado
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {entrega.descripcion}
                  {entrega.talla && ` - Talla: ${entrega.talla}`}
                  {` - Cantidad: ${entrega.cantidad}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  Entregado: {format(new Date(entrega.fecha_entrega), "dd/MM/yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">
                  Confirmado: {entrega.fecha_confirmacion && format(new Date(entrega.fecha_confirmacion), "dd/MM/yyyy HH:mm")}
                </div>
                {entrega.observaciones && (
                  <div className="text-xs italic text-muted-foreground mt-2">
                    {entrega.observaciones}
                  </div>
                )}
              </div>
              {entrega.firma_empleado && (
                <button
                  onClick={() => setSelectedFirma(entrega.firma_empleado)}
                  className="ml-4 text-xs text-primary hover:underline"
                >
                  Ver firma
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {entregas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            No hay entregas confirmadas
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedFirma !== null} onOpenChange={(open) => !open && setSelectedFirma(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Firma de Confirmación</DialogTitle>
          </DialogHeader>
          {selectedFirma && (
            <div className="border rounded-lg p-4 bg-white">
              <img src={selectedFirma} alt="Firma" className="w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
