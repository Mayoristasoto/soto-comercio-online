import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { NovedadRow } from "@/pages/NovedadesLiquidacion";

const TIPOS = [
  { value: "licencia_medica", label: "Licencia médica" },
  { value: "dia_medico", label: "Día médico" },
  { value: "dia_estudio", label: "Día de estudio" },
  { value: "examen_estudiantil", label: "Examen estudiantil" },
  { value: "matrimonio", label: "Matrimonio" },
  { value: "fallecimiento_familiar", label: "Fallecimiento familiar" },
  { value: "nacimiento_hijo", label: "Nacimiento de hijo" },
  { value: "maternidad", label: "Maternidad" },
  { value: "paternidad", label: "Paternidad" },
  { value: "donacion_sangre", label: "Donación de sangre" },
  { value: "actividad_gremial", label: "Actividad gremial" },
  { value: "permiso", label: "Permiso" },
  { value: "justificacion_inasistencia", label: "Otra justificación" },
];

interface Props {
  row: NovedadRow;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function JustificarAusenciaDialog({ row, open, onClose, onSaved }: Props) {
  const [tipo, setTipo] = useState("dia_medico");
  const [descripcion, setDescripcion] = useState("");
  const [certificado, setCertificado] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      let certUrl: string | null = null;
      if (certificado) {
        const path = `justificaciones/${row.empleado_id}/${Date.now()}-${certificado.name}`;
        const { error: upErr } = await supabase.storage.from("certificados-medicos").upload(path, certificado);
        if (!upErr) {
          const { data: pub } = supabase.storage.from("certificados-medicos").getPublicUrl(path);
          certUrl = pub.publicUrl;
        }
      }

      if (tipo === "licencia_medica") {
        const { error } = await supabase.from("ausencias_medicas").insert({
          empleado_id: row.empleado_id,
          fecha_inicio: row.fecha,
          fecha_fin: row.fecha,
          tipo_enfermedad: descripcion || "Licencia médica",
          certificado_url: certUrl,
          observaciones: descripcion,
          registrado_por: uid,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("solicitudes_generales").insert({
          empleado_id: row.empleado_id,
          tipo_solicitud: tipo,
          fecha_solicitud: row.fecha,
          descripcion: descripcion || TIPOS.find(t => t.value === tipo)?.label,
          estado: "aprobada",
          aprobado_por: uid,
          fecha_aprobacion: new Date().toISOString(),
          comentarios_aprobacion: "Justificada desde Novedades de Liquidación",
          archivo_adjunto: certUrl,
        } as any);
        if (error) throw error;
      }

      toast.success("Ausencia justificada");
      onSaved();
    } catch (e: any) {
      console.error(e);
      toast.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar ausencia — {format(new Date(row.fecha + "T00:00:00"), "dd/MM/yyyy")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de justificación</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observación</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalle adicional..." />
          </div>
          <div>
            <Label>Certificado (opcional)</Label>
            <Input type="file" accept="image/*,.pdf" onChange={(e) => setCertificado(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Justificar y aprobar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
