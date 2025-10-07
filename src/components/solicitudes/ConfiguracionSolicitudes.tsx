import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Configuracion {
  id: string;
  tipo_solicitud: string;
  dias_anticipacion: number;
  fecha_inicio_ventana: string | null;
  fecha_fin_ventana: string | null;
  monto_maximo_mes: number | null;
  activo: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  dia_medico: 'Día Médico',
  adelanto_sueldo: 'Adelanto de Sueldo',
  permiso: 'Permiso',
  vacaciones: 'Vacaciones'
};

export function ConfiguracionSolicitudes() {
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfiguraciones();
  }, []);

  const fetchConfiguraciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_configuracion')
        .select('*')
        .order('tipo_solicitud');

      if (error) throw error;
      setConfiguraciones(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Configuracion>) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('solicitudes_configuracion')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente",
      });

      fetchConfiguraciones();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (id: string, field: keyof Configuracion, value: any) => {
    setConfiguraciones(prev =>
      prev.map(config =>
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {configuraciones.map((config) => (
        <Card key={config.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{TIPO_LABELS[config.tipo_solicitud]}</CardTitle>
                <CardDescription>
                  Configura las reglas para este tipo de solicitud
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`activo-${config.id}`}>Activo</Label>
                <Switch
                  id={`activo-${config.id}`}
                  checked={config.activo}
                  onCheckedChange={(checked) =>
                    handleUpdate(config.id, { activo: checked })
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Días de Anticipación</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.dias_anticipacion}
                  onChange={(e) =>
                    updateField(config.id, 'dias_anticipacion', parseInt(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Días mínimos de anticipación para solicitar
                </p>
              </div>

              {config.tipo_solicitud === 'adelanto_sueldo' && (
                <div className="space-y-2">
                  <Label>Monto Máximo Mensual</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.monto_maximo_mes || ''}
                    onChange={(e) =>
                      updateField(config.id, 'monto_maximo_mes', parseFloat(e.target.value) || null)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Monto máximo que puede solicitar por mes
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio Ventana</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !config.fecha_inicio_ventana && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.fecha_inicio_ventana ? (
                        format(new Date(config.fecha_inicio_ventana), "PPP", { locale: es })
                      ) : (
                        <span>Sin restricción</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={config.fecha_inicio_ventana ? new Date(config.fecha_inicio_ventana) : undefined}
                      onSelect={(date) =>
                        updateField(config.id, 'fecha_inicio_ventana', date?.toISOString().split('T')[0] || null)
                      }
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin Ventana</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !config.fecha_fin_ventana && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {config.fecha_fin_ventana ? (
                        format(new Date(config.fecha_fin_ventana), "PPP", { locale: es })
                      ) : (
                        <span>Sin restricción</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={config.fecha_fin_ventana ? new Date(config.fecha_fin_ventana) : undefined}
                      onSelect={(date) =>
                        updateField(config.id, 'fecha_fin_ventana', date?.toISOString().split('T')[0] || null)
                      }
                      disabled={(date) =>
                        config.fecha_inicio_ventana ? date < new Date(config.fecha_inicio_ventana) : false
                      }
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              onClick={() => handleUpdate(config.id, config)}
              disabled={saving}
              className="w-full"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}