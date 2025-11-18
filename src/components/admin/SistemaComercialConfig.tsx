import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Check, AlertCircle, Wallet, Bug, Download, Upload, Copy, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

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
  const [sendingRequest, setSendingRequest] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionDebug, setConnectionDebug] = useState<string>('');
  const [idCentumTest, setIdCentumTest] = useState('6234');
  const [endpointTest, setEndpointTest] = useState('/rubros');
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [jsonImport, setJsonImport] = useState('');
  const [envImport, setEnvImport] = useState('');
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
      setConfig(data as any);
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
        description: "No se pudo conectar con la API",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const handleTestSaldo = async () => {
    setTestingSaldo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "No se pudo obtener el usuario actual",
          variant: "destructive",
        });
        return;
      }

      const { data: empleadoData, error: empleadoError } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (empleadoError || !empleadoData) {
        toast({
          title: "Error",
          description: "No se pudo encontrar el empleado asociado",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('centum-consultar-saldo', {
        body: { empleado_id: empleadoData.id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Éxito",
          description: `Saldo obtenido correctamente. ID Centum: ${data.id_centum}`,
        });
        loadApiLogs();
      } else {
        toast({
          title: "Error en la consulta",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error al probar consulta de saldo:', error);
      toast({
        title: "Error",
        description: error.message || "Error al probar la consulta de saldo",
        variant: "destructive",
      });
    } finally {
      setTestingSaldo(false);
    }
  };

  const handleExportCurl = async () => {
    try {
      // Generar token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('centum-generate-token');
      
      if (tokenError || !tokenData) {
        toast({
          title: "Error",
          description: "No se pudo generar el token",
          variant: "destructive",
        });
        return;
      }

      const { token, baseUrl, suiteConsumidorId } = tokenData;
      const endpoint = config.endpoint_consulta_saldo || '/Rubros';
      const url = `${baseUrl}${endpoint}`;

      const curlCommand = `curl -v "${url}" \\
  -H 'CentumSuiteConsumidorApiPublicaId: ${suiteConsumidorId}' \\
  -H 'CentumSuiteAccessToken: ${token}' \\
  -H 'Accept: application/json'`;

      await navigator.clipboard.writeText(curlCommand);
      
      toast({
        title: "¡Copiado!",
        description: "Comando curl copiado al portapapeles",
      });
    } catch (error: any) {
      console.error('Error al exportar curl:', error);
      toast({
        title: "Error",
        description: error.message || "Error al generar comando curl",
        variant: "destructive",
      });
    }
  };

  const handleSendRequest = async () => {
    setSendingRequest(true);
    try {
      console.log('=== DEBUG: Enviando petición a través de edge function ===');
      
      // Obtener el empleado actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "No hay usuario autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data: empleadoData, error: empleadoError } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (empleadoError || !empleadoData) {
        toast({
          title: "Error",
          description: "No se pudo encontrar el empleado asociado",
          variant: "destructive",
        });
        return;
      }

      console.log('Empleado ID:', empleadoData.id);

      // Usar el edge function que ya existe (ahora con GET)
      const functionUrl = `https://iizwnijtgfvanhqqjeyw.supabase.co/functions/v1/centum-consultar-saldo?empleado_id=${empleadoData.id}`;
      
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      const data = await response.json();
      const error = !response.ok ? data : null;

      console.log('=== DEBUG: Respuesta del edge function ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Error al enviar la petición",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Petición exitosa",
          description: `Saldo consultado correctamente. ID Centum: ${data.id_centum}`,
        });
        console.log('Respuesta completa:', data);
      } else {
        toast({
          title: "Error en la petición",
          description: data.error || "Error desconocido",
          variant: "destructive",
        });
      }

      loadApiLogs();
    } catch (error: any) {
      console.error('Error al enviar petición:', error);
      toast({
        title: "Error",
        description: error.message || "Error al enviar la petición",
        variant: "destructive",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleTestCentumConnection = async () => {
    setTestingConnection(true);
    setConnectionDebug('Iniciando prueba de conexión (Postman Exact)...\n');
    
    try {
      const { data, error } = await supabase.functions.invoke('centum-postman-exact', {
        body: { 
          id_centum: idCentumTest,
          endpoint: endpointTest
        }
      });

      if (error) throw error;

      const debugInfo = `
=== PRUEBA DE CONEXIÓN CENTUM (POSTMAN EXACT) ===

✓ Token Generado:
${data.debug?.token || 'No disponible'}

✓ URL Completa:
${data.debug?.url || 'No disponible'}

✓ Headers Enviados:
${JSON.stringify(data.debug?.headers, null, 2)}

✓ Generación del Token:
  - Fecha UTC: ${data.debug?.fechaUTC}
  - GUID: ${data.debug?.guid}
  - Texto para hash: ${data.debug?.textoParaHash}
  - Hash SHA1: ${data.debug?.hash}

✓ Respuesta de Centum:
  Status: ${data.status}
  ${data.success ? '✓ Conexión exitosa' : '✗ Error en conexión'}

${data.data ? `Datos recibidos:\n${JSON.stringify(data.data, null, 2)}` : ''}

NOTA: Esta función replica EXACTAMENTE el script de Postman.
      `;

      setConnectionDebug(debugInfo);

      toast({
        title: data.success ? "Conexión exitosa" : "Error en conexión",
        description: data.success ? "La conexión con Centum funciona correctamente" : "Error al conectar con Centum",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      const errorInfo = `Error al probar conexión:\n${error.message}`;
      setConnectionDebug(errorInfo);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleImportJson = () => {
    try {
      const parsedConfig = JSON.parse(jsonImport);
      
      // Validar que tenga las propiedades necesarias
      if (!parsedConfig) {
        throw new Error('JSON inválido');
      }

      setConfig({
        ...config!,
        centum_base_url: parsedConfig.centum_base_url || config!.centum_base_url,
        centum_suite_consumidor_api_publica_id: parsedConfig.centum_suite_consumidor_api_publica_id || config!.centum_suite_consumidor_api_publica_id,
        endpoint_consulta_saldo: parsedConfig.endpoint_consulta_saldo || config!.endpoint_consulta_saldo,
        api_url: parsedConfig.api_url || config!.api_url,
        endpoint_acreditacion: parsedConfig.endpoint_acreditacion || config!.endpoint_acreditacion,
        habilitado: parsedConfig.habilitado !== undefined ? parsedConfig.habilitado : config!.habilitado,
      });

      toast({
        title: "Configuración importada",
        description: "Los datos se han cargado correctamente. Revise y guarde los cambios."
      });

      setJsonImport('');
    } catch (error: any) {
      toast({
        title: "Error al importar",
        description: error.message || "El JSON no es válido",
        variant: "destructive"
      });
    }
  };

  const replaceEnvironmentVariables = (text: string, envVars: Record<string, any>): string => {
    let result = text;
    Object.entries(envVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    return result;
  };

  const handleTestJsonImport = async () => {
    setTestingConnection(true);
    setConnectionDebug('Probando JSON con environment...\n');
    
    try {
      let parsedConfig = JSON.parse(jsonImport);
      let envVars: Record<string, any> = {};
      
      // Parsear environment si existe
      if (envImport.trim()) {
        try {
          const parsedEnv = JSON.parse(envImport);
          
          // Postman environment format
          if (parsedEnv.values && Array.isArray(parsedEnv.values)) {
            parsedEnv.values.forEach((item: any) => {
              envVars[item.key] = item.value;
            });
          } else {
            // Simple key-value format
            envVars = parsedEnv;
          }
          
          setConnectionDebug(prev => prev + `\n✓ Variables de environment cargadas: ${Object.keys(envVars).length}\n`);
        } catch (envError) {
          throw new Error('Environment JSON inválido');
        }
      }
      
      // Reemplazar variables en la configuración
      const configStr = JSON.stringify(parsedConfig);
      const configWithEnv = replaceEnvironmentVariables(configStr, envVars);
      parsedConfig = JSON.parse(configWithEnv);
      
      if (!parsedConfig.centum_base_url) {
        throw new Error('El JSON debe contener centum_base_url');
      }

      setConnectionDebug(prev => prev + '\n✓ Configuración con variables reemplazadas\n');

      // Guardar temporalmente en la base de datos para probar
      const { error: updateError } = await supabase
        .from('sistema_comercial_config')
        .update({
          centum_base_url: parsedConfig.centum_base_url,
          centum_suite_consumidor_api_publica_id: parsedConfig.centum_suite_consumidor_api_publica_id,
          endpoint_consulta_saldo: parsedConfig.endpoint_consulta_saldo,
        })
        .eq('id', config!.id);

      if (updateError) throw updateError;

      // Reemplazar variables en endpoint de prueba
      const testEndpointWithEnv = replaceEnvironmentVariables(endpointTest, envVars);
      const testIdWithEnv = replaceEnvironmentVariables(idCentumTest, envVars);

      setConnectionDebug(prev => prev + '\n✓ Probando conexión...\n');

      // Probar conexión
      const { data, error } = await supabase.functions.invoke('centum-postman-exact', {
        body: { 
          id_centum: testIdWithEnv,
          endpoint: testEndpointWithEnv
        }
      });

      if (error) throw error;

      const debugInfo = `
=== PRUEBA CON JSON + ENVIRONMENT ===

✓ Variables de Environment:
${Object.keys(envVars).length > 0 ? JSON.stringify(envVars, null, 2) : 'No se cargaron variables'}

✓ Configuración Final (con variables reemplazadas):
${JSON.stringify(parsedConfig, null, 2)}

✓ Endpoint de prueba: ${testEndpointWithEnv}
✓ ID Centum de prueba: ${testIdWithEnv}

✓ Token Generado:
${data.debug?.token || 'No disponible'}

✓ URL Completa:
${data.debug?.url || 'No disponible'}

✓ Respuesta de Centum:
  Status: ${data.status}
  ${data.success ? '✓ Conexión exitosa' : '✗ Error en conexión'}

${data.data ? `Datos recibidos:\n${JSON.stringify(data.data, null, 2)}` : ''}
      `;

      setConnectionDebug(debugInfo);

      toast({
        title: data.success ? "Conexión exitosa" : "Error en conexión",
        description: data.success ? "El JSON + Environment funcionan correctamente" : "Hay errores en la conexión",
        variant: data.success ? "default" : "destructive",
      });

      // Recargar configuración original
      await loadConfig();
    } catch (error: any) {
      const errorInfo = `Error al probar JSON:\n${error.message}`;
      setConnectionDebug(errorInfo);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      await loadConfig();
    } finally {
      setTestingConnection(false);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      centum_base_url: config?.centum_base_url,
      centum_suite_consumidor_api_publica_id: config?.centum_suite_consumidor_api_publica_id,
      endpoint_consulta_saldo: config?.endpoint_consulta_saldo,
      api_url: config?.api_url,
      endpoint_acreditacion: config?.endpoint_acreditacion,
      habilitado: config?.habilitado,
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(jsonStr);

    toast({
      title: "Configuración copiada",
      description: "La configuración se copió al portapapeles"
    });
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
          Configuración de la API externa para acreditación de premios y consulta de saldos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado de integración */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {config.habilitado ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                Estado: {config.habilitado ? 'Habilitado' : 'Deshabilitado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {config.habilitado 
                  ? 'La integración está activa' 
                  : 'La integración está inactiva'}
              </p>
            </div>
          </div>
          <Switch
            checked={config.habilitado}
            onCheckedChange={(checked) => setConfig({ ...config, habilitado: checked })}
          />
        </div>

        {/* Botón de Test prominente */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Button
            onClick={handleTestCentumConnection}
            size="lg"
            variant="default"
            disabled={testingConnection}
            className="h-16"
          >
            {testingConnection ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Probando Conexión...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-5 w-5" />
                Probar Conexión Centum
              </>
            )}
          </Button>

          <Button
            onClick={handleTestSaldo}
            size="lg"
            variant="outline"
            disabled={testingSaldo}
            className="h-16"
          >
            {testingSaldo ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Consultando Saldo...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Probar Consulta de Saldo
              </>
            )}
          </Button>

          <Button
            onClick={handleExportCurl}
            size="lg"
            variant="secondary"
            className="h-16"
          >
            <Copy className="mr-2 h-5 w-5" />
            Exportar Petición GET
          </Button>

          <Button
            onClick={handleSendRequest}
            disabled={sendingRequest}
            size="lg"
            variant="default"
            className="h-16"
          >
            {sendingRequest ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Enviar Petición
              </>
            )}
          </Button>
        </div>

        {/* Importar/Exportar JSON */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h3 className="font-medium flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Importar/Exportar Configuración (Postman)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jsonImport">JSON de Postman (Request/Collection)</Label>
              <Textarea
                id="jsonImport"
                placeholder='Pega aquí el JSON del request o collection de Postman...'
                value={jsonImport}
                onChange={(e) => setJsonImport(e.target.value)}
                className="font-mono text-xs h-32"
              />
              <p className="text-xs text-muted-foreground">
                Puede contener variables como {'{'}{'{'} variable {'}}'} que se reemplazarán con el environment
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="envImport">Archivo de Environment (Variables)</Label>
              <Textarea
                id="envImport"
                placeholder='{"values": [{"key": "baseUrl", "value": "https://..."}, {"key": "token", "value": "..."}]}'
                value={envImport}
                onChange={(e) => setEnvImport(e.target.value)}
                className="font-mono text-xs h-32"
              />
              <p className="text-xs text-muted-foreground">
                Formato: Postman environment o JSON simple con pares clave-valor
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleTestJsonImport}
              variant="default"
              size="sm"
              disabled={!jsonImport.trim() || testingConnection}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <Bug className="mr-2 h-3 w-3" />
                  Probar JSON + Environment
                </>
              )}
            </Button>
            <Button
              onClick={handleImportJson}
              variant="outline"
              size="sm"
              disabled={!jsonImport.trim()}
            >
              <Upload className="mr-2 h-3 w-3" />
              Importar JSON
            </Button>
            <Button
              onClick={handleExportJson}
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-3 w-3" />
              Copiar Config Actual
            </Button>
          </div>
        </div>

        {/* Centum Base URL */}
        <div className="space-y-2">
          <Label htmlFor="centum_base_url">Centum Base URL Completa</Label>
          <Input
            id="centum_base_url"
            type="text"
            placeholder="https://plataforma4.centum.com.ar:23990/BL11/SuiteConsumidorApiPublica/3"
            value={config.centum_base_url || ''}
            onChange={(e) => setConfig({ ...config, centum_base_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            URL base completa de Centum (incluyendo /SuiteConsumidorApiPublica/ID)
          </p>
        </div>

        {/* Centum Suite Consumidor API Publica ID */}
        <div className="space-y-2">
          <Label htmlFor="centum_suite_id">Centum Suite Consumidor API Publica ID</Label>
          <Input
            id="centum_suite_id"
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

        {/* Endpoint de consulta de saldo */}
        <div className="space-y-2">
          <Label htmlFor="endpoint_saldo">Endpoint de Consulta de Saldo</Label>
          <Input
            id="endpoint_saldo"
            type="text"
            placeholder="/SaldosCuentasCorrientes/{{idCentum}}?fechaVencimientoHasta=2025-12-31&composicionReal=false"
            value={config.endpoint_consulta_saldo || ''}
            onChange={(e) => setConfig({ ...config, endpoint_consulta_saldo: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Ruta del endpoint para consultar saldo. Use {'{idCentum}'} o {'{idCliente}'} como placeholder para el ID del empleado
          </p>
        </div>

        {/* Prueba de conexión Centum estilo Postman */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            <h3 className="font-medium">Prueba de Conexión Centum (Debug)</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="idCentumTest">ID Centum para prueba</Label>
            <Input
              id="idCentumTest"
              type="text"
              placeholder="6234"
              value={idCentumTest}
              onChange={(e) => setIdCentumTest(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ingrese el ID Centum a consultar (ej: 6234 para Gonzalo Justiniano)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endpointTest">Endpoint a probar</Label>
            <Input
              id="endpointTest"
              type="text"
              placeholder="/rubros"
              value={endpointTest}
              onChange={(e) => setEndpointTest(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Endpoint para probar la conexión (ej: /rubros, /SaldosCuentasCorrientes/{'{idCentum}'})
            </p>
          </div>

          <Button
            onClick={handleTestCentumConnection}
            variant="outline"
            disabled={testingConnection || !endpointTest}
          >
            {testingConnection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-4 w-4" />
                Probar Conexión Centum
              </>
            )}
          </Button>

          {connectionDebug && (
            <div className="space-y-2">
              <Label>Resultado de la prueba:</Label>
              <Textarea
                value={connectionDebug}
                readOnly
                className="font-mono text-xs h-64"
              />
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Configuración'
            )}
          </Button>
        </div>

        {/* Logs de API */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Logs de API (Últimos 50)</h3>
            <Button
              onClick={loadApiLogs}
              variant="outline"
              size="sm"
              disabled={loadingLogs}
            >
              {loadingLogs ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Refrescar'
              )}
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Status Code</TableHead>
                  <TableHead>Duración (ms)</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay logs disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  apiLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.tipo}</TableCell>
                      <TableCell>
                        <Badge variant={log.exitoso ? "default" : "destructive"}>
                          {log.exitoso ? 'Éxito' : 'Error'}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.status_code || 'N/A'}</TableCell>
                      <TableCell>{log.duracion_ms || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
