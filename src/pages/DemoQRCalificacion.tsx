import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { QrCode, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

export default function DemoQRCalificacion() {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState("");
  const [ventaId, setVentaId] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    loadEmpleados();
  }, []);

  const loadEmpleados = async () => {
    const { data } = await supabase
      .from("empleados")
      .select("id, nombre, apellido, legajo")
      .eq("activo", true)
      .order("nombre");

    setEmpleados(data || []);
  };

  const generateQR = () => {
    if (!selectedEmpleado || !ventaId) {
      toast.error("Selecciona un empleado e ingresa un ID de venta");
      return;
    }

    const timestamp = Date.now();
    const token = btoa(`${selectedEmpleado}-${ventaId}-${timestamp}`);
    const url = `${window.location.origin}/calificar-v2/${token}`;
    setQrUrl(url);
    toast.success("QR generado correctamente");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrUrl);
    toast.success("URL copiada al portapapeles");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Demo - Generador de QR para Calificaciones</h1>
        <p className="text-muted-foreground mt-2">
          Genera códigos QR de prueba para calificar empleados
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Generar QR
            </CardTitle>
            <CardDescription>
              Simula la generación de QR desde el sistema de facturación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empleado</label>
              <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.apellido} {emp.legajo && `(${emp.legajo})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ID de Venta</label>
              <Input
                placeholder="Ej: FACT-2024-001"
                value={ventaId}
                onChange={(e) => setVentaId(e.target.value)}
              />
            </div>

            <Button onClick={generateQR} className="w-full">
              Generar QR
            </Button>
          </CardContent>
        </Card>

        {/* QR Preview */}
        <Card>
          <CardHeader>
            <CardTitle>QR Generado</CardTitle>
            <CardDescription>
              Escanea o copia la URL para probar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qrUrl ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg flex justify-center">
                  <QRCode value={qrUrl} size={200} />
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={qrUrl} readOnly className="text-xs" />
                    <Button size="icon" variant="outline" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => window.open(qrUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir en nueva pestaña
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <QrCode className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Genera un QR para verlo aquí</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instrucciones */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1">
            <li>El sistema de facturación genera un token único por cada venta</li>
            <li>El token incluye: ID del empleado + ID de venta + timestamp</li>
            <li>Se imprime un QR en la factura con la URL de calificación</li>
            <li>El cliente escanea el QR y accede a la página pública</li>
            <li>Califica al empleado (1-5 estrellas) y opcionalmente deja un comentario</li>
            <li>La calificación se registra y aparece en el legajo del empleado</li>
            <li>Cada QR solo puede usarse una vez</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
