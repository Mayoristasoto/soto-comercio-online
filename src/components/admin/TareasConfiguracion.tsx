import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings } from "lucide-react";

export const TareasConfiguracion = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmarAlSalir, setConfirmarAlSalir] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas_configuracion')
        .select('confirmar_tareas_al_salir')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setConfirmarAlSalir(data.confirmar_tareas_al_salir);
      }
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

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      // Obtener el primer registro
      const { data: configData } = await supabase
        .from('tareas_configuracion')
        .select('id')
        .limit(1)
        .single();

      if (configData) {
        const { error } = await supabase
          .from('tareas_configuracion')
          .update({ confirmar_tareas_al_salir: checked })
          .eq('id', configData.id);

        if (error) throw error;

        setConfirmarAlSalir(checked);
        toast({
          title: "Configuración actualizada",
          description: checked 
            ? "Los empleados ahora deberán confirmar tareas al salir" 
            : "La confirmación de tareas al salir está desactivada"
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Configuración de Tareas</CardTitle>
        </div>
        <CardDescription>
          Configura el comportamiento del módulo de tareas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="confirmar-salida">
              Confirmar tareas al finalizar jornada
            </Label>
            <p className="text-sm text-muted-foreground">
              Los empleados deberán revisar y confirmar sus tareas del día al hacer check-out
            </p>
          </div>
          <Switch
            id="confirmar-salida"
            checked={confirmarAlSalir}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
};
