import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendario, createCalendario, updateCalendario } from "@/lib/calendariosService";
import { useToast } from "@/hooks/use-toast";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(calendario?.nombre ?? "");
      setDescripcion(calendario?.descripcion ?? "");
      setColor(calendario?.color ?? COLORS[0]);
      setEsPublico(calendario?.es_publico ?? false);
    }
  }, [open, calendario]);

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      if (calendario) {
        await updateCalendario(calendario.id, { nombre, descripcion, color, es_publico: esPublico });
      } else {
        await createCalendario({ nombre, descripcion, color, es_publico: esPublico });
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
      <DialogContent>
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
