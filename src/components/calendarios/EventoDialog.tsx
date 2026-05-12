import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendario, createEvento, updateEvento, deleteEvento, EventoUnificado } from "@/lib/calendariosService";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendarios: Calendario[];
  evento?: EventoUnificado | null;
  fechaInicial?: Date;
  defaultCalendarioId?: string;
  onSaved: () => void;
}

const TIPOS = [
  { v: "evento", l: "Evento" },
  { v: "deadline", l: "Deadline" },
  { v: "reunion", l: "Reunión" },
  { v: "recordatorio", l: "Recordatorio" },
];

const fmtLocal = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function EventoDialog({
  open,
  onOpenChange,
  calendarios,
  evento,
  fechaInicial,
  defaultCalendarioId,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const editables = calendarios.filter((c) => c.permiso === "owner" || c.permiso === "edit");

  const [calId, setCalId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [todoDia, setTodoDia] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [tipo, setTipo] = useState("evento");
  const [estado, setEstado] = useState("pendiente");
  const [saving, setSaving] = useState(false);
  const isEdit = evento?.source === "real";

  useEffect(() => {
    if (!open) return;
    if (isEdit && evento) {
      setCalId(evento.calendario_id);
      setTitulo(evento.titulo);
      setDescripcion(evento.descripcion ?? "");
      setUbicacion(evento.ubicacion ?? "");
      setTodoDia(evento.todo_el_dia);
      setInicio(fmtLocal(evento.fecha_inicio));
      setFin(fmtLocal(evento.fecha_fin));
      setTipo(evento.tipo as string);
      setEstado(evento.estado ?? "pendiente");
    } else {
      const base = fechaInicial ?? new Date();
      base.setHours(9, 0, 0, 0);
      const finBase = new Date(base);
      finBase.setHours(10, 0, 0, 0);
      setCalId(defaultCalendarioId ?? editables[0]?.id ?? "");
      setTitulo("");
      setDescripcion("");
      setUbicacion("");
      setTodoDia(false);
      setInicio(fmtLocal(base));
      setFin(fmtLocal(finBase));
      setTipo("evento");
      setEstado("pendiente");
    }
  }, [open, evento, fechaInicial]);

  const handleSave = async () => {
    if (!calId || !titulo.trim() || !inicio || !fin) return;
    setSaving(true);
    try {
      const payload = {
        calendario_id: calId,
        titulo,
        descripcion: descripcion || null,
        ubicacion: ubicacion || null,
        fecha_inicio: new Date(inicio).toISOString(),
        fecha_fin: new Date(fin).toISOString(),
        todo_el_dia: todoDia,
        color: null,
        tipo: tipo as any,
        estado: estado as any,
        recurrencia: null,
      };
      if (isEdit && evento) {
        await updateEvento(evento.id, payload);
      } else {
        await createEvento(payload);
      }
      toast({ title: isEdit ? "Evento actualizado" : "Evento creado" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!evento) return;
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await deleteEvento(evento.id);
      toast({ title: "Evento eliminado" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Nuevo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Reunión de equipo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Calendario</Label>
              <Select value={calId} onValueChange={setCalId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {editables.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.nombre}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Todo el día</Label>
            <Switch checked={todoDia} onCheckedChange={setTodoDia} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Inicio</Label>
              <Input
                type={todoDia ? "date" : "datetime-local"}
                value={todoDia ? inicio.slice(0, 10) : inicio}
                onChange={(e) => setInicio(todoDia ? `${e.target.value}T00:00` : e.target.value)}
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type={todoDia ? "date" : "datetime-local"}
                value={todoDia ? fin.slice(0, 10) : fin}
                onChange={(e) => setFin(todoDia ? `${e.target.value}T23:59` : e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Ubicación</Label>
            <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} />
          </div>
          {isEdit && (
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {isEdit && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !titulo.trim() || !calId}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
