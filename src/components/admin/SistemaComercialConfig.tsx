import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Check, AlertCircle, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SistemaComercialConfig {
  id: string;
  api_url: string | null;
  api_token: string | null;
  endpoint_acreditacion: string;
  endpoint_consulta_saldo: string | null;
  habilitado: boolean;
  centum_base_url: string | null;
  centum_suite_consumidor_api_publica_id: string | null;
}

interface ApiLog {
  id: string;
  timestamp: string;
  tipo: string;
  empleado_id: string | null;
  status_code: number | null;
  exitoso: boolean;
  error_message: string | null;
  duracion_ms: number | null;
}

export function SistemaComercialConfig() {
  const [config, setConfig] = useState<SistemaComercialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSaldo, setTestingSaldo] = useState(false);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
    loadApiLogs();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('sistema_comercial_config')
        .select('*')
        .single();

      if (error) throw error;
      setConfig(data as any); // Cast needed while types update
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadApiLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setApiLogs(data || []);
    } catch (error) {
      console.error('Error loading API logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sistema_comercial_config')
        .update({
          api_url: config.api_url,
          api_token: config.api_token,
          endpoint_acreditacion: config.endpoint_acreditacion,
          endpoint_consulta_saldo: config.endpoint_consulta_saldo,
          habilitado: config.habilitado,
          centum_base_url: config.centum_base_url,
          centum_suite_consumidor_api_publica_id: config.centum_suite_consumidor_api_publica_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente"
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config?.api_url) {
      toast({
        title: "Error",
        description: "Debes configurar la URL de la API primero",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.api_token) {
        headers['Authorization'] = `Bearer ${config.api_token}`;
      }

      const testUrl = `${config.api_url}/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        toast({
          title: "Conexión exitosa",
          description: "La API responde correctamente"
        });
      } else {
        toast({
          title: "Error de conexión",
          description: `La API respondió con código ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con la API del sistema comercial",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestSaldo = async () => {
    setTestingSaldo(true);
    try {
      // Obtener el empleado actual para usar su ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!empleado) throw new Error('No se encontró el empleado');

      const { data, error } = await supabase.functions.invoke('centum-consultar-saldo', {
        body: { empleado_id: empleado.id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Consulta exitosa",
          description: `Saldo obtenido: ${JSON.stringify(data.saldo)}`,
        });
        loadApiLogs(); // Recargar logs después de la prueba
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error testing saldo:', error);
      toast({
        title: "Error en consulta de saldo",
        description: error.message || "No se pudo consultar el saldo",
        variant: "destructive"
      });
    } finally {
      setTestingSaldo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se pudo cargar la configuración del sistema comercial
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Integración Sistema Comercial
        </CardTitle>
        <CardDescription>
          Configura la integración con el sistema comercial para acreditar automáticamente premios monetarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado de integración */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <Label className="text-base">Estado de la integración</Label>
            <p className="text-sm text-muted-foreground">
              {config.habilitado ? 'La integración está activa' : 'La integración está desactivada'}
            </p>
          </div>
          <Switch
            checked={config.habilitado}
            onCheckedChange={(checked) => setConfig({ ...config, habilitado: checked })}
          />
        </div>

        {/* Centum Base URL */}
        <div className="space-y-2">
          <Label htmlFor="centum_base_url">Centum Base URL</Label>
          <Input
            id="centum_base_url"
            type="url"
            placeholder="https://plataforma4.centum.com.ar:23990/BL11"
            value={config.centum_base_url || ''}
            onChange={(e) => setConfig({ ...config, centum_base_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            URL base de la API de Centum
          </p>
        </div>

        {/* Centum Suite Consumidor API Pública ID */}
        <div className="space-y-2">
          <Label htmlFor="centum_suite_consumidor_api_publica_id">Centum Suite Consumidor API Pública ID</Label>
          <Input
            id="centum_suite_consumidor_api_publica_id"
            type="text"
            placeholder="3"
            value={config.centum_suite_consumidor_api_publica_id || ''}
            onChange={(e) => setConfig({ ...config, centum_suite_consumidor_api_publica_id: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            ID público de API de Centum Suite Consumidor
          </p>
        </div>

        {/* Centum Clave Pública */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Clave Pública de Centum:</p>
            <p className="text-sm">
              La clave pública está configurada como secreto seguro <code className="bg-muted px-1 rounded">SISTEMA_COMERCIAL_API_KEY</code>.
              Para actualizarla, contacte al administrador del sistema.
            </p>
          </AlertDescription>
        </Alert>

        {/* Endpoint de acreditación */}
        <div className="space-y-2">
          <Label htmlFor="endpoint">Endpoint de Acreditación</Label>
          <Input
            id="endpoint"
            type="text"
            placeholder="/api/empleados/acreditar"
            value={config.endpoint_acreditacion}
            onChange={(e) => setConfig({ ...config, endpoint_acreditacion: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Ruta del endpoint para acreditar dinero en cuenta corriente
          </p>
        </div>

        {/* Endpoint de consulta de saldo */}
        <div className="space-y-2">
          <Label htmlFor="endpoint_consulta_saldo">Endpoint de Consulta de Saldo (Centum)</Label>
          <Input
            id="endpoint_consulta_saldo"
            type="text"
            placeholder="/CuentaCorriente/{idCentum}/Saldo"
            value={config.endpoint_consulta_saldo || ''}
            onChange={(e) => setConfig({ ...config, endpoint_consulta_saldo: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Ruta del endpoint para consultar saldo. Use {'{idCentum}'} como placeholder para el ID del empleado
          </p>
        </div>

        {/* Información sobre el payload */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Formato de datos enviados a la API:</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "empleado_id": "legajo o dni",
  "empleado_dni": "12345678",
  "empleado_email": "empleado@ejemplo.com",
  "empleado_nombre": "Juan Pérez",
  "monto": 1000,
  "concepto": "Premio: Nombre del Premio",
  "referencia_interna": "uuid-asignacion"
}`}
            </pre>
          </AlertDescription>
        </Alert>

        {/* Botones de acción */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleTestConnection}
            variant="outline"
            disabled={testing || !config.api_url}
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Probar Conexión
              </>
            )}
          </Button>

          <Button
            onClick={handleTestSaldo}
            variant="outline"
            disabled={testingSaldo || !config.habilitado}
          >
            {testingSaldo ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Probar Consulta Saldo
              </>
            )}
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>

        {/* Sección de logs de API */}
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Logs de API</h3>
              <p className="text-sm text-muted-foreground">
                Historial de llamadas al sistema comercial
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadApiLogs}
              disabled={loadingLogs}
            >
              {loadingLogs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Actualizar"
              )}
            </Button>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiLogs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No hay logs de API disponibles
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.exitoso ? "default" : "destructive"}>
                          {log.exitoso ? "Éxito" : "Error"}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.status_code || '-'}</TableCell>
                      <TableCell>{log.duracion_ms ? `${log.duracion_ms}ms` : '-'}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}