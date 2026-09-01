import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Sucursal {
  id: string;
  nombre: string;
}
interface Plantilla {
  id: string;
  nombre: string;
}
interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  sucursal_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SIN_PLANTILLA = "none";

export function NuevoControlDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursalId, setSucursalId] = useState("");
  const [plantillaId, setPlantillaId] = useState<string>(SIN_PLANTILLA);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [encargados, setEncargados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    setFecha(new Date(ahora.getTime() - offset).toISOString().slice(0, 16));
    (async () => {
      const db = supabase as any;
      const suc = await db.from("sucursales").select("id, nombre").eq("activo", true).order("nombre");
      const pl = await db.from("checklist_plantillas").select("id, nombre").eq("activo", true).order("nombre");
      const emp = await db
        .from("empleados")
        .select("id, nombre, apellido, sucursal_id")
        .eq("activo", true)
        .order("apellido");
      setSucursales((suc.data as Sucursal[]) || []);
      setPlantillas((pl.data as Plantilla[]) || []);
      setEmpleados((emp.data as Empleado[]) || []);
    })();
  }, [open]);

  const empleadosSucursal = empleados.filter((e) => !sucursalId || e.sucursal_id === sucursalId);

  const crear = async () => {
    if (!sucursalId) {
      toast.error("Seleccioná una sucursal");
      return;
    }
    setGuardando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: control, error } = await supabase
        .from("checklist_controles")
        .insert({
          sucursal_id: sucursalId,
          plantilla_id: plantillaId === SIN_PLANTILLA ? null : plantillaId,
          titulo: titulo.trim() || null,
          fecha_hora: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
          responsable_id: userData.user?.id ?? null,
          estado: "borrador",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (plantillaId !== SIN_PLANTILLA) {
        const { data: items } = await supabase
          .from("checklist_plantilla_items")
          .select("texto, seccion, orden")
          .eq("plantilla_id", plantillaId)
          .order("orden");
        if (items?.length) {
          const { error: itErr } = await supabase.from("checklist_control_items").insert(
            items.map((i, idx) => ({
              control_id: control.id,
              texto: i.texto,
              seccion: i.seccion,
              orden: i.orden ?? idx,
            }))
          );
          if (itErr) throw itErr;
        }
      }

      if (encargados.length) {
        const { error: encErr } = await supabase
          .from("checklist_control_encargados")
          .insert(encargados.map((empleado_id) => ({ control_id: control.id, empleado_id })));
        if (encErr) throw encErr;
      }

      toast.success("Control creado");
      onOpenChange(false);
      setTitulo("");
      setEncargados([]);
      setPlantillaId(SIN_PLANTILLA);
      navigate(`/rrhh/checklist/${control.id}`);
    } catch (e: any) {
      toast.error("Error al crear el control: " + (e.message || e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo control</DialogTitle>
          <DialogDescription>
            Definí la sucursal, el momento del control y los encargados de turno presentes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Sucursal</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Plantilla</Label>
              <Select value={plantillaId} onValueChange={setPlantillaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_PLANTILLA}>Sin plantilla (ítems manuales)</SelectItem>
                  {plantillas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Título (opcional)</Label>
            <Input
              value={titulo}
              maxLength={120}
              placeholder="Ej. Control de apertura"
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Encargados de turno</Label>
            <ScrollArea className="h-36 rounded-md border p-2">
              {empleadosSucursal.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">Seleccioná una sucursal para ver su personal.</p>
              ) : (
                empleadosSucursal.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 py-1 text-sm">
                    <Checkbox
                      checked={encargados.includes(e.id)}
                      onCheckedChange={(v) =>
                        setEncargados((prev) => (v ? [...prev, e.id] : prev.filter((id) => id !== e.id)))
                      }
                    />
                    {e.apellido} {e.nombre}
                  </label>
                ))
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={crear} disabled={guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear control
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
