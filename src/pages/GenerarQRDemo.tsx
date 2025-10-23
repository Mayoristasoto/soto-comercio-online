import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Copy, ExternalLink, Settings, Gift, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function GenerarQRDemo() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState("");
  const [ventaId, setVentaId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadEmpleados();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("calificaciones_config")
        .select("clave, valor");

      if (error) throw error;

      const configObj: any = {};
      data?.forEach((item) => {
        configObj[item.clave] = item.valor;
      });

      setConfig(configObj);
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel izquierdo: Generador */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Generador de QR Demo</CardTitle>
                  <CardDescription>
                    Simula el sistema de calificaciones con QR
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin?tab=calificaciones')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </Button>
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

              <Button onClick={generateQRUrl} className="w-full" size="lg">
                <QrCode className="w-4 h-4 mr-2" />
                Generar QR de Calificación
              </Button>
            </div>

            {generatedUrl && (
              <div className="space-y-4 p-4 bg-muted rounded-lg border-2">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCode value={generatedUrl} size={200} />
                </div>

                <div className="space-y-2">
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
                    <Button size="icon" variant="default" onClick={openInNewTab}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Instrucciones de prueba
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
                    <li>Escanea el QR o haz clic en el botón de link externo</li>
                    <li>Completa el formulario como si fueras un cliente</li>
                    <li>La calificación se registrará y verás tu número de sorteo</li>
                    <li>Cada QR solo se puede usar una vez</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel derecho: Configuración actual */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5" />
                Configuración Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Sorteos</span>
                      </div>
                      <Badge variant={config.sorteo_activo === 'true' ? 'default' : 'secondary'}>
                        {config.sorteo_activo === 'true' ? 'Activado' : 'Desactivado'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Calificar servicio</span>
                      </div>
                      <Badge variant={config.calificar_servicio === 'true' ? 'default' : 'secondary'}>
                        {config.calificar_servicio === 'true' ? 'Sí' : 'No'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Datos del cliente</span>
                      </div>
                      <Badge variant={config.requiere_datos_cliente === 'true' ? 'default' : 'secondary'}>
                        {config.requiere_datos_cliente === 'true' ? 'Obligatorios' : 'Opcionales'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <h4 className="font-medium text-sm">Mensajes personalizados</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted/30 p-3 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Título sorteo:</p>
                        <p className="font-medium">{config.sorteo_titulo}</p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded">
                        <p className="text-xs text-muted-foreground mb-1">Mensaje agradecimiento:</p>
                        <p className="font-medium">{config.mensaje_agradecimiento}</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/admin?tab=calificaciones')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Editar configuración
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Cargando configuración...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-lg">💡 Sobre el sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Demo del sistema de calificaciones:</strong> Este generador simula cómo funcionaría el sistema integrado con las facturas reales.
              </p>
              <div className="space-y-2">
                <p className="font-medium">En producción:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Cada factura incluiría automáticamente un QR único</li>
                  <li>Los clientes escanean y califican su experiencia</li>
                  <li>Participan automáticamente en sorteos mensuales</li>
                  <li>Los datos se registran para análisis y premios</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
