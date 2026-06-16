import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Empleado { id: string; nombre: string; apellido: string; dni: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empleados: Empleado[];
  fechaInicial?: Date;
  onSaved?: () => void;
}

type Estado = "pendiente" | "aprobada" | "gozadas" | "rechazada";

export function CargaManualVacacionesDialog({ open, onOpenChange, empleados, fechaInicial, onSaved }: Props) {
  const { toast } = useToast();
  const [empleadoId, setEmpleadoId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState<Estado>("aprobada");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const base = fechaInicial ?? new Date();
      const fi = format(base, "yyyy-MM-dd");
      setFechaInicio(fi);
      setFechaFin(fi);
      setEmpleadoId("");
      setEstado("aprobada");
      setComentario("");
    }
  }, [open, fechaInicial]);

  const seleccionado = empleados.find((e) => e.id === empleadoId);

  const handleSave = async () => {
    if (!empleadoId) {
      toast({ title: "Seleccioná un empleado", variant: "destructive" });
      return;
    }
    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
      toast({ title: "Fechas inválidas", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);

      // Conflictos
      const { data: conflictos, error: cErr } = await supabase
        .from("solicitudes_vacaciones")
        .select("id")
        .eq("empleado_id", empleadoId)
        .in("estado", ["aprobada", "pendiente", "gozadas"] as any)
        .lte("fecha_inicio", fechaFin)
        .gte("fecha_fin", fechaInicio);
      if (cErr) throw cErr;
      if (conflictos && conflictos.length > 0) {
        toast({
          title: "Conflicto de fechas",
          description: "El empleado ya tiene una solicitud que se solapa.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      let aprobadorId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from("empleados").select("id").eq("user_id", user.id).maybeSingle();
        aprobadorId = (emp as any)?.id ?? null;
      }

      const payload: any = {
        empleado_id: empleadoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado,
        motivo: comentario || "Carga manual por RRHH",
      };
      if (estado !== "pendiente") {
        payload.aprobado_por = aprobadorId;
        payload.fecha_aprobacion = new Date().toISOString();
        payload.comentarios_aprobacion = comentario || null;
      }

      const { error } = await supabase
        .from("solicitudes_vacaciones")
        .insert(payload);
      if (error) throw error;

      toast({ title: "Vacaciones cargadas correctamente" });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar vacaciones manualmente</DialogTitle>
          <DialogDescription>
            Registrá vacaciones por un empleado y definí el estado inicial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Empleado</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  {seleccionado ? `${seleccionado.apellido}, ${seleccionado.nombre}` : "Buscar empleado..."}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Nombre, apellido o DNI..." />
                  <CommandList>
                    <CommandEmpty>Sin resultados</CommandEmpty>
                    <CommandGroup>
                      {empleados.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.apellido} ${e.nombre} ${e.dni ?? ""}`}
                          onSelect={() => {
                            setEmpleadoId(e.id);
                            setPickerOpen(false);
                          }}
                        >
                          <span className="truncate">{e.apellido}, {e.nombre}</span>
                          {e.dni && <span className="ml-auto text-xs text-muted-foreground">{e.dni}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="gozadas">Gozadas</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Comentario (opcional)</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Motivo o nota interna"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
