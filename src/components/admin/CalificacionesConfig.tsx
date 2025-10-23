import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save, Gift, Star, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ConfigItem {
  clave: string;
  valor: string;
  descripcion: string;
  tipo: string;
}

export default function CalificacionesConfig() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("calificaciones_config")
        .select("*")
        .order("clave");

      if (error) throw error;

      const configMap: Record<string, string> = {};
      data?.forEach((item: ConfigItem) => {
        configMap[item.clave] = item.valor;
      });

      setConfig(configMap);
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (clave: string, valor: string) => {
    try {
      const { error } = await supabase
        .from("calificaciones_config")
        .update({ valor, updated_at: new Date().toISOString() })
        .eq("clave", clave);

      if (error) throw error;

      setConfig(prev => ({ ...prev, [clave]: valor }));
    } catch (error) {
      console.error("Error updating config:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all config values
      const updates = Object.entries(config).map(([clave, valor]) =>
        updateConfig(clave, valor)
      );

      await Promise.all(updates);
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const getBooleanValue = (key: string) => config[key] === 'true';

  const setBooleanValue = (key: string, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value ? 'true' : 'false' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Configuración de Calificaciones</h2>
            <p className="text-sm text-muted-foreground">
              Personaliza el sistema de calificaciones y sorteos
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Configuración del Sorteo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <CardTitle>Sorteo y Premios</CardTitle>
            </div>
            <CardDescription>
              Configura la participación en sorteos para los clientes que califican
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activar sorteos</Label>
                <p className="text-sm text-muted-foreground">
                  Los clientes participan automáticamente al calificar
                </p>
              </div>
              <Switch
                checked={getBooleanValue('sorteo_activo')}
                onCheckedChange={(checked) => setBooleanValue('sorteo_activo', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="sorteo_titulo">Título del sorteo</Label>
              <Input
                id="sorteo_titulo"
                value={config.sorteo_titulo || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, sorteo_titulo: e.target.value }))}
                placeholder="¡Participa en nuestro sorteo mensual!"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sorteo_descripcion">Descripción del sorteo</Label>
              <Textarea
                id="sorteo_descripcion"
                value={config.sorteo_descripcion || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, sorteo_descripcion: e.target.value }))}
                placeholder="Descripción de los premios y condiciones..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Este mensaje se muestra al cliente después de calificar
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Calificaciones */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <CardTitle>Sistema de Calificación</CardTitle>
            </div>
            <CardDescription>
              Configura qué aspectos pueden calificar los clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Calificar servicio general</Label>
                <p className="text-sm text-muted-foreground">
                  Además del empleado, solicitar calificación del servicio
                </p>
              </div>
              <Switch
                checked={getBooleanValue('calificar_servicio')}
                onCheckedChange={(checked) => setBooleanValue('calificar_servicio', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="mensaje_agradecimiento">Mensaje de agradecimiento</Label>
              <Input
                id="mensaje_agradecimiento"
                value={config.mensaje_agradecimiento || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, mensaje_agradecimiento: e.target.value }))}
                placeholder="¡Gracias por tu calificación!"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Se muestra después de enviar la calificación
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Datos del Cliente</CardTitle>
            </div>
            <CardDescription>
              Configura qué información solicitar a los clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Solicitar datos del cliente</Label>
                <p className="text-sm text-muted-foreground">
                  Nombre, DNI y teléfono para participar en sorteos
                </p>
              </div>
              <Switch
                checked={getBooleanValue('requiere_datos_cliente')}
                onCheckedChange={(checked) => setBooleanValue('requiere_datos_cliente', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="campos_opcionales">Campos opcionales</Label>
              <Input
                id="campos_opcionales"
                value={config.campos_opcionales || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, campos_opcionales: e.target.value }))}
                placeholder="telefono"
              />
              <p className="text-xs text-muted-foreground">
                Campos que no son obligatorios (separados por coma): <code>nombre</code>, <code>dni</code>, <code>telefono</code>
              </p>
              <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
                <p className="font-medium">Ejemplos:</p>
                <p>• <code>telefono</code> - Solo el teléfono es opcional</p>
                <p>• <code>nombre,telefono</code> - Nombre y teléfono opcionales</p>
                <p>• (vacío) - Todos los campos obligatorios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Info */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-sm">Vista previa del sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sorteos:</span>
            <span className={getBooleanValue('sorteo_activo') ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {getBooleanValue('sorteo_activo') ? "✓ Activado" : "✗ Desactivado"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Calificación de servicio:</span>
            <span className={getBooleanValue('calificar_servicio') ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {getBooleanValue('calificar_servicio') ? "✓ Activado" : "✗ Desactivado"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Datos del cliente:</span>
            <span className={getBooleanValue('requiere_datos_cliente') ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {getBooleanValue('requiere_datos_cliente') ? "✓ Obligatorios" : "✗ No requeridos"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
