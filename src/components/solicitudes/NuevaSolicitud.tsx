import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NuevaSolicitudProps {
  empleadoId: string;
}

interface Configuracion {
  tipo_solicitud: string;
  dias_anticipacion: number;
  fecha_inicio_ventana: string | null;
  fecha_fin_ventana: string | null;
  monto_maximo_mes: number | null;
}

const TIPO_LABELS: Record<string, string> = {
  dia_medico: 'Día Médico',
  adelanto_sueldo: 'Adelanto de Sueldo',
  permiso: 'Permiso'
};

export function NuevaSolicitud({ empleadoId }: NuevaSolicitudProps) {
  const [tipoSolicitud, setTipoSolicitud] = useState<string>("");
  const [fechaSolicitud, setFechaSolicitud] = useState<Date>();
  const [monto, setMonto] = useState<string>("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [montoSolicitadoMes, setMontoSolicitadoMes] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfiguraciones();
  }, []);

  useEffect(() => {
    if (tipoSolicitud === 'adelanto_sueldo') {
      fetchMontoMes();
    }
  }, [tipoSolicitud]);

  const fetchConfiguraciones = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes_configuracion')
        .select('*')
        .eq('activo', true);

      if (error) throw error;
      setConfiguraciones(data || []);
    } catch (error) {
      console.error('Error fetching configuraciones:', error);
    }
  };

  const fetchMontoMes = async () => {
    try {
      const mesActual = new Date();
      const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
      const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('solicitudes_generales')
        .select('monto')
        .eq('empleado_id', empleadoId)
        .eq('tipo_solicitud', 'adelanto_sueldo')
        .gte('fecha_solicitud', primerDia.toISOString().split('T')[0])
        .lte('fecha_solicitud', ultimoDia.toISOString().split('T')[0])
        .in('estado', ['pendiente', 'aprobada']);

      if (error) throw error;

      const total = data?.reduce((sum, s) => sum + (s.monto || 0), 0) || 0;
      setMontoSolicitadoMes(total);
    } catch (error) {
      console.error('Error fetching monto mes:', error);
    }
  };

  const validateSolicitud = () => {
    const config = configuraciones.find(c => c.tipo_solicitud === tipoSolicitud);
    if (!config) return "Configuración no encontrada";

    if (!fechaSolicitud) return "Debes seleccionar una fecha";

    // Validar días de anticipación
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaMin = addDays(hoy, config.dias_anticipacion);
    
    if (fechaSolicitud < fechaMin) {
      return `Debes solicitar con al menos ${config.dias_anticipacion} día(s) de anticipación`;
    }

    // Validar ventana de tiempo
    if (config.fecha_inicio_ventana && config.fecha_fin_ventana) {
      const inicio = new Date(config.fecha_inicio_ventana);
      const fin = new Date(config.fecha_fin_ventana);
      
      if (fechaSolicitud < inicio || fechaSolicitud > fin) {
        return `Las solicitudes solo están habilitadas entre ${format(inicio, "d 'de' MMMM", { locale: es })} y ${format(fin, "d 'de' MMMM", { locale: es })}`;
      }
    }

    // Validar monto para adelantos
    if (tipoSolicitud === 'adelanto_sueldo') {
      if (!monto || parseFloat(monto) <= 0) {
        return "Debes ingresar un monto válido";
      }

      const montoSolicitud = parseFloat(monto);
      const montoTotal = montoSolicitadoMes + montoSolicitud;

      if (config.monto_maximo_mes && montoTotal > config.monto_maximo_mes) {
        return `El monto excede el límite mensual. Ya solicitaste $${montoSolicitadoMes.toFixed(2)} de $${config.monto_maximo_mes.toFixed(2)}`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateSolicitud();
    if (error) {
      setWarning(error);
      return;
    }

    setWarning(null);

    try {
      setLoading(true);

      const { error: insertError } = await supabase
        .from('solicitudes_generales')
        .insert({
          empleado_id: empleadoId,
          tipo_solicitud: tipoSolicitud,
          fecha_solicitud: fechaSolicitud!.toISOString().split('T')[0],
          monto: tipoSolicitud === 'adelanto_sueldo' ? parseFloat(monto) : null,
          descripcion: descripcion || null,
          estado: 'pendiente'
        });

      if (insertError) throw insertError;

      toast({
        title: "Solicitud creada",
        description: "Tu solicitud ha sido enviada para aprobación",
      });

      // Reset form
      setTipoSolicitud("");
      setFechaSolicitud(undefined);
      setMonto("");
      setDescripcion("");
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const config = configuraciones.find(c => c.tipo_solicitud === tipoSolicitud);
  const minDate = config ? addDays(new Date(), config.dias_anticipacion) : new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Solicitud</CardTitle>
        <CardDescription>
          Completa el formulario para crear una nueva solicitud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {warning && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Tipo de Solicitud</Label>
          <Select value={tipoSolicitud} onValueChange={setTipoSolicitud}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              {configuraciones.map((config) => (
                <SelectItem key={config.tipo_solicitud} value={config.tipo_solicitud}>
                  {TIPO_LABELS[config.tipo_solicitud]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tipoSolicitud && (
          <>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaSolicitud && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaSolicitud ? (
                      format(fechaSolicitud, "PPP", { locale: es })
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaSolicitud}
                    onSelect={setFechaSolicitud}
                    disabled={(date) => date < minDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {config && config.dias_anticipacion > 0 && (
                <p className="text-xs text-muted-foreground">
                  * Requiere {config.dias_anticipacion} día(s) de anticipación
                </p>
              )}
            </div>

            {tipoSolicitud === 'adelanto_sueldo' && (
              <>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {config?.monto_maximo_mes && (
                    <p className="text-xs text-muted-foreground">
                      Ya solicitaste ${montoSolicitadoMes.toFixed(2)} de ${config.monto_maximo_mes.toFixed(2)} este mes
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                placeholder="Describe el motivo de tu solicitud"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Solicitud
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}