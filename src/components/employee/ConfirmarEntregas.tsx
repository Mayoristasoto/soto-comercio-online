import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, CheckCircle, Clock, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export function ConfirmarEntregas() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntregas();
  }, []);

  useEffect(() => {
    if (selectedEntrega && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set high resolution
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      // Configure drawing
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [selectedEntrega]);

  const loadEntregas = async () => {
    const { data: empleado } = await supabase.rpc("get_current_empleado_full");
    if (!empleado || !empleado[0]) return;

    const { data, error } = await supabase
      .from("entregas_elementos")
      .select("*")
      .eq("empleado_id", empleado[0].id)
      .order("fecha_entrega", { ascending: false });

    if (error) {
      toast.error("Error al cargar entregas");
      return;
    }
    setEntregas(data || []);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const confirmarEntrega = async () => {
    if (!selectedEntrega || isEmpty) {
      toast.error("Debe firmar antes de confirmar");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);

    const signatureData = canvas.toDataURL("image/png");

    const { error } = await supabase
      .from("entregas_elementos")
      .update({
        estado: "confirmado",
        fecha_confirmacion: new Date().toISOString(),
        firma_empleado: signatureData,
      })
      .eq("id", selectedEntrega.id);

    setLoading(false);

    if (error) {
      toast.error("Error al confirmar entrega");
      return;
    }

    toast.success("Entrega confirmada exitosamente");
    setSelectedEntrega(null);
    loadEntregas();
  };

  const pendientes = entregas.filter((e) => e.estado === "pendiente");
  const confirmadas = entregas.filter((e) => e.estado === "confirmado");

  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              Entregas Pendientes de Confirmación
            </CardTitle>
            <CardDescription>
              Confirme la recepción de los siguientes elementos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendientes.map((entrega) => (
                <Card key={entrega.id} className="p-4 border-orange-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold">{entrega.tipo_elemento}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entrega.descripcion}
                        {entrega.talla && ` - Talla: ${entrega.talla}`}
                        {` - Cantidad: ${entrega.cantidad}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fecha de entrega: {format(new Date(entrega.fecha_entrega), "dd/MM/yyyy HH:mm")}
                      </div>
                      {entrega.observaciones && (
                        <div className="text-xs italic text-muted-foreground mt-2">
                          {entrega.observaciones}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedEntrega(entrega)}
                    >
                      <PenTool className="mr-2 h-3 w-3" />
                      Confirmar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {confirmadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Elementos Confirmados
            </CardTitle>
            <CardDescription>
              Historial de elementos recibidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {confirmadas.map((entrega) => (
                <Card key={entrega.id} className="p-4 border-green-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">{entrega.tipo_elemento}</span>
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
                    </div>
                    <Badge className="bg-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Confirmado
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {entregas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            No hay entregas registradas
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedEntrega !== null} onOpenChange={(open) => !open && setSelectedEntrega(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Recepción</DialogTitle>
            <DialogDescription>
              Firme para confirmar que ha recibido el siguiente elemento
            </DialogDescription>
          </DialogHeader>

          {selectedEntrega && (
            <div className="space-y-4">
              <Card className="p-3 bg-muted">
                <div className="text-sm space-y-1">
                  <div><strong>Elemento:</strong> {selectedEntrega.tipo_elemento}</div>
                  <div><strong>Descripción:</strong> {selectedEntrega.descripcion}</div>
                  {selectedEntrega.talla && <div><strong>Talla:</strong> {selectedEntrega.talla}</div>}
                  <div><strong>Cantidad:</strong> {selectedEntrega.cantidad}</div>
                </div>
              </Card>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Firma aquí:</label>
                  <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
                    Limpiar
                  </Button>
                </div>
                <div className="border-2 border-dashed rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-48 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedEntrega(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmarEntrega}
                  disabled={isEmpty || loading}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {loading ? "Confirmando..." : "Confirmar Recepción"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
