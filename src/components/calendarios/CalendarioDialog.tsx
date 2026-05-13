import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Calendario,
  createCalendario,
  updateCalendario,
  listEmpleadosAfectados,
  setEmpleadosAfectados,
  getNotifConfig,
  upsertNotifConfig,
} from "@/lib/calendariosService";
import { useToast } from "@/hooks/use-toast";
import { EmpleadosAfectadosPicker } from "./EmpleadosAfectadosPicker";

const COLORS = [
  "#4b0d6d", "#95198d", "#e04403", "#10b981", "#3b82f6",
  "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#0ea5e9",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendario?: Calendario | null;
  onSaved: () => void;
}

export function CalendarioDialog({ open, onOpenChange, calendario, onSaved }: Props) {
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [esPublico, setEsPublico] = useState(false);
  const [afectados, setAfectados] = useState<string[]>([]);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notificarRrhh, setNotificarRrhh] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(calendario?.nombre ?? "");
    setDescripcion(calendario?.descripcion ?? "");
    setColor(calendario?.color ?? COLORS[0]);
    setEsPublico(calendario?.es_publico ?? false);

    if (calendario?.id) {
      (async () => {
        try {
          const [emps, cfg] = await Promise.all([
            listEmpleadosAfectados(calendario.id),
            getNotifConfig("calendario", calendario.id),
          ]);
          setAfectados(emps.map((e) => e.empleado_id));
          setNotifInApp(cfg.notif_in_app);
          setNotificarRrhh(cfg.notificar_rrhh);
        } catch {
          setAfectados([]);
          setNotifInApp(true);
          setNotificarRrhh(false);
        }
      })();
    } else {
      setAfectados([]);
      setNotifInApp(true);
      setNotificarRrhh(false);
    }
  }, [open, calendario]);

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      let calId = calendario?.id;
      if (calendario) {
        await updateCalendario(calendario.id, { nombre, descripcion, color, es_publico: esPublico });
      } else {
        const created = await createCalendario({ nombre, descripcion, color, es_publico: esPublico });
        calId = (created as any)?.id;
      }
      if (calId) {
        await Promise.all([
          setEmpleadosAfectados(calId, afectados),
          upsertNotifConfig("calendario", calId, {
            notif_in_app: notifInApp,
            notif_kiosco: false,
            notificar_rrhh: notificarRrhh,
          }),
        ]);
      }
      toast({ title: calendario ? "Calendario actualizado" : "Calendario creado" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{calendario ? "Editar calendario" : "Nuevo calendario"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Equipo RRHH" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2 transition"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Calendario público</Label>
              <p className="text-xs text-muted-foreground">Visible para todos los empleados</p>
            </div>
            <Switch checked={esPublico} onCheckedChange={setEsPublico} />
          </div>

          <Separator />

          <div>
            <Label>Empleados afectados (@arrobar)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Recibirán notificación de cada nuevo evento cargado en este calendario.
            </p>
            <EmpleadosAfectadosPicker value={afectados} onChange={setAfectados} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enviar notificaciones en la app</Label>
              <p className="text-xs text-muted-foreground">
                Activá/desactivá las notificaciones a los empleados afectados.
              </p>
            </div>
            <Switch checked={notifInApp} onCheckedChange={setNotifInApp} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notificar a RRHH</Label>
              <p className="text-xs text-muted-foreground">
                Avisa a admin RRHH cada novedad cargada en este calendario.
              </p>
            </div>
            <Switch checked={notificarRrhh} onCheckedChange={setNotificarRrhh} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !nombre.trim()}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
