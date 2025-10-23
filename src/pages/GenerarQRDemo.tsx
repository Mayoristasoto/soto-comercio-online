import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function GenerarQRDemo() {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState("");
  const [ventaId, setVentaId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmpleados();
  }, []);

  const loadEmpleados = async () => {
    try {
      const { data, error } = await supabase
        .from("empleados_basic")
        .select("id, nombre, apellido, puesto")
        .eq("activo", true)
        .order("apellido");

      if (error) throw error;
      setEmpleados(data || []);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  const generateQRUrl = () => {
    if (!selectedEmpleado) {
      toast.error("Selecciona un empleado");
      return;
    }

    // Generar token: empleadoId-ventaId-timestamp
    const timestamp = Date.now();
    const venta = ventaId || `VENTA-${timestamp}`;
    const token = btoa(`${selectedEmpleado}-${venta}-${timestamp}`);
    
    // URL completa para calificación (nueva versión con sorteo)
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/calificar-v2/${token}`;
    
    setGeneratedUrl(url);
    toast.success("URL generada correctamente");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    toast.success("URL copiada al portapapeles");
  };

  const openInNewTab = () => {
    window.open(generatedUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Generador de QR Demo</CardTitle>
              <CardDescription>
                Genera URLs de calificación para pruebas (simula el QR de facturas)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado a calificar</Label>
              <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.apellido}, {emp.nombre} {emp.puesto ? `- ${emp.puesto}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ID de Venta (opcional)</Label>
              <Input
                value={ventaId}
                onChange={(e) => setVentaId(e.target.value)}
                placeholder="VENTA-12345"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Si no se especifica, se genera automáticamente
              </p>
            </div>

            <Button onClick={generateQRUrl} className="w-full">
              <QrCode className="w-4 h-4 mr-2" />
              Generar URL de Calificación
            </Button>
          </div>

          {generatedUrl && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <Label>URL generada</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={openInNewTab}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Instrucciones:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Copia la URL o ábrela en una nueva pestaña</li>
                  <li>Simula ser un cliente y califica al empleado</li>
                  <li>La calificación aparecerá en el legajo del empleado</li>
                  <li>Cada URL solo se puede usar una vez</li>
                </ol>
              </div>

              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm">
                <strong>Nota:</strong> En producción, el sistema de facturación generaría estos QR automáticamente al emitir cada factura.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
