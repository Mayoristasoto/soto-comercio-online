import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export interface EventoJustificable {
  empleado_id: string;
  empleado: string;
  fecha: string;          // yyyy-MM-dd
  tipo_evento: string;    // sin_fichar | sin_salida | sin_entrada | ...
  categoria_id?: string | null;
  observacion?: string | null;
}

interface Categoria {
  id: string;
  nombre: string;
  es_justificada: boolean;
}

interface Props {
  evento: EventoJustificable | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function JustificarEventoDialog({ evento, open, onClose, onSaved }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("categorias_justificacion_asistencia")
      .select("id,nombre,es_justificada")
      .eq("activa", true)
      .order("orden")
      .then(({ data }) => setCategorias((data || []) as Categoria[]));
  }, []);

  useEffect(() => {
    setCategoriaId(evento?.categoria_id || "");
    setObservacion(evento?.observacion || "");
  }, [evento]);

  const guardar = async () => {
    if (!evento) return;
    if (!categoriaId) { toast.error("Elegí un motivo"); return; }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("justificaciones_asistencia")
        .upsert({
          tipo_evento: evento.tipo_evento,
          empleado_id: evento.empleado_id,
          fecha_evento: evento.fecha,
          categoria_id: categoriaId,
          observacion: observacion || null,
          creado_por: userData.user?.id ?? null,
        }, { onConflict: "tipo_evento,empleado_id,fecha_evento" });
      if (error) throw error;
      toast.success("Justificación guardada");
      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const quitar = async () => {
    if (!evento) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("justificaciones_asistencia")
        .delete()
        .eq("tipo_evento", evento.tipo_evento)
        .eq("empleado_id", evento.empleado_id)
        .eq("fecha_evento", evento.fecha);
      if (error) throw error;
      toast.success("Justificación eliminada");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar novedad</DialogTitle>
          <DialogDescription>
            {evento ? `${evento.empleado} — ${format(parseISO(evento.fecha + "T00:00:00"), "dd/MM/yyyy")}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}{!c.es_justificada ? " (no justificada)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Observación</Label>
            <Textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Detalle adicional (opcional)"
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {evento?.categoria_id && (
            <Button variant="ghost" onClick={quitar} disabled={saving}>Quitar</Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
