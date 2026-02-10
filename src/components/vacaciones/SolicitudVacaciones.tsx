import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

const validarReglasVacaciones = (inicio: Date, fin: Date): { valid: boolean; message: string } => {
  // Regla 1: Diciembre bloqueado
  const startMonth = inicio.getMonth();
  const endMonth = fin.getMonth();
  const startYear = inicio.getFullYear();
  const endYear = fin.getFullYear();
  
  for (let y = startYear; y <= endYear; y++) {
    const mStart = y === startYear ? startMonth : 0;
    const mEnd = y === endYear ? endMonth : 11;
    for (let m = mStart; m <= mEnd; m++) {
      if (m === 11) {
        return {
          valid: false,
          message: "No se pueden solicitar vacaciones en el mes de diciembre."
        };
      }
    }
  }

  // Regla 2: Receso invernal
  const anio = inicio.getFullYear();
  const recesoSemana1Inicio = new Date(anio, 6, 20);
  const recesoSemana1Fin = new Date(anio, 6, 26);
  const recesoSemana2Inicio = new Date(anio, 6, 27);
  const recesoSemana2Fin = new Date(anio, 7, 2);

  const tocaSemana1 = inicio <= recesoSemana1Fin && fin >= recesoSemana1Inicio;
  const tocaSemana2 = inicio <= recesoSemana2Fin && fin >= recesoSemana2Inicio;

  if (tocaSemana1 && tocaSemana2) {
    return {
      valid: false,
      message: "Solo podés tomar una semana del receso invernal (20/7 al 2/8). Si querés 14 días, combiná una semana previa con la primera semana del receso (20-26 julio), o la segunda semana del receso (27 julio - 2 agosto) con una semana posterior."
    };
  }

  return { valid: true, message: '' };
};

interface SolicitudVacacionesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
  onSuccess: () => void;
}

export function SolicitudVacaciones({
  open,
  onOpenChange,
  empleadoId,
  onSuccess,
}: SolicitudVacacionesProps) {
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const { toast } = useToast();

  // Validar reglas y conflictos cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const reglas = validarReglasVacaciones(fechaInicio, fechaFin);
      if (!reglas.valid) {
        setWarningMessage(`🚫 ${reglas.message}`);
        setHasConflict(true);
        return;
      }
      checkConflicts();
    } else {
      setWarningMessage(null);
      setHasConflict(false);
    }
  }, [fechaInicio, fechaFin]);

  const checkConflicts = async () => {
    if (!fechaInicio || !fechaFin) return;

    try {
      // Obtener info del empleado actual
      const { data: empleado } = await supabase
        .from('empleados')
        .select('puesto, sucursal_id')
        .eq('id', empleadoId)
        .single();

      if (!empleado || !empleado.puesto || !empleado.sucursal_id) {
        setWarningMessage(null);
        setHasConflict(false);
        return;
      }

      // Buscar solicitudes del mismo puesto y sucursal que se solapen
      const { data: solicitudes } = await supabase
        .from('solicitudes_vacaciones')
        .select(`
          id,
          fecha_inicio,
          fecha_fin,
          estado,
          empleados!solicitudes_vacaciones_empleado_id_fkey(nombre, apellido, puesto, sucursal_id)
        `)
        .neq('empleado_id', empleadoId)
        .or(`and(fecha_inicio.lte.${fechaFin.toISOString().split('T')[0]},fecha_fin.gte.${fechaInicio.toISOString().split('T')[0]})`)
        .in('estado', ['pendiente', 'aprobada']);

      // Filtrar solo los del mismo puesto y sucursal
      const conflictos = solicitudes?.filter((sol: any) => 
        sol.empleados?.puesto === empleado.puesto && 
        sol.empleados?.sucursal_id === empleado.sucursal_id
      );

      if (conflictos && conflictos.length > 0) {
        const aprobadas = conflictos.filter((c: any) => c.estado === 'aprobada');
        const pendientes = conflictos.filter((c: any) => c.estado === 'pendiente');

        if (aprobadas.length > 0) {
          const nombres = aprobadas.map((c: any) => 
            `${c.empleados.nombre} ${c.empleados.apellido}`
          ).join(', ');
          setWarningMessage(
            `⚠️ CONFLICTO: ${nombres} ya tiene vacaciones aprobadas en estas fechas. No puedes solicitar estos días.`
          );
          setHasConflict(true);
        } else if (pendientes.length > 0) {
          const nombres = pendientes.map((c: any) => 
            `${c.empleados.nombre} ${c.empleados.apellido}`
          ).join(', ');
          setWarningMessage(
            `ℹ️ AVISO: ${nombres} tiene una solicitud pendiente para estas fechas. Puedes continuar pero ten en cuenta que ambos están solicitando las mismas fechas.`
          );
          setHasConflict(false);
        }
      } else {
        setWarningMessage(null);
        setHasConflict(false);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleSubmit = async () => {
    if (!fechaInicio || !fechaFin) {
      toast({
        title: "Error",
        description: "Debes seleccionar las fechas de inicio y fin",
        variant: "destructive",
      });
      return;
    }

    if (fechaFin < fechaInicio) {
      toast({
        title: "Error",
        description: "La fecha de fin debe ser posterior a la fecha de inicio",
        variant: "destructive",
      });
      return;
    }

    // Validación de reglas como red de seguridad
    const reglas = validarReglasVacaciones(fechaInicio, fechaFin);
    if (!reglas.valid) {
      toast({ title: "No se puede solicitar", description: reglas.message, variant: "destructive" });
      return;
    }

    if (hasConflict) {
      toast({
        title: "No se puede solicitar",
        description: "Ya existe una solicitud aprobada para estas fechas en tu puesto y sucursal",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Verificar bloqueos
      const { data: bloqueos } = await supabase
        .from('vacaciones_bloqueos')
        .select('*')
        .eq('activo', true)
        .lte('fecha_inicio', fechaFin.toISOString().split('T')[0])
        .gte('fecha_fin', fechaInicio.toISOString().split('T')[0]);

      if (bloqueos && bloqueos.length > 0) {
        toast({
          title: "Periodo bloqueado",
          description: `Las fechas seleccionadas están bloqueadas: ${bloqueos[0].motivo}`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from('solicitudes_vacaciones').insert({
        empleado_id: empleadoId,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        motivo: motivo || null,
        estado: 'pendiente',
      });

      if (error) throw error;

      toast({
        title: "Solicitud creada",
        description: "Tu solicitud de vacaciones ha sido enviada",
      });

      setFechaInicio(undefined);
      setFechaFin(undefined);
      setMotivo("");
      onSuccess();
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Vacaciones</DialogTitle>
          <DialogDescription>
            Completa la información para solicitar tus vacaciones
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm mb-1">Reglas de vacaciones</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>No se pueden solicitar vacaciones en diciembre.</li>
              <li>Del receso invernal (20/7 al 2/8) solo se puede tomar 1 semana.</li>
              <li>Para 14 días: combinar 1 semana fuera del receso + 1 semana del receso.</li>
            </ul>
          </div>
        </div>

        {warningMessage && (
          <div className={`p-4 rounded-lg border-2 ${
            hasConflict 
              ? 'bg-destructive/10 border-destructive text-destructive' 
              : 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100'
          }`}>
            <p className="text-sm font-medium">{warningMessage}</p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Fecha de Inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaInicio ? (
                    format(fechaInicio, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={setFechaInicio}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Fin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaFin && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaFin ? (
                    format(fechaFin, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaFin}
                  onSelect={setFechaFin}
                  disabled={(date) => date < (fechaInicio || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Describe el motivo de tu solicitud"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Solicitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
