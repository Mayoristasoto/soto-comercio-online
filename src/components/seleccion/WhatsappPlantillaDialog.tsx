import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle } from "lucide-react";
import { PLANTILLA_WHATSAPP_DEFAULT, aplicarPlantillaWhatsapp } from "@/lib/ats";
import type { PlantillaWhatsapp } from "./PlantillasWhatsapp";

const db = supabase as any;
const ESTANDAR = "estandar";

export interface DatosWhatsapp { numero: string; link: string; nombre: string; apellido: string; puesto: string }

interface Props { datos: DatosWhatsapp | null; onClose: () => void; onEnviar: (texto: string) => void }

export default function WhatsappPlantillaDialog({ datos, onClose, onEnviar }: Props) {
  const [plantillas, setPlantillas] = useState<PlantillaWhatsapp[]>([]);
  const [elegida, setElegida] = useState(ESTANDAR);

  useEffect(() => {
    if (!datos) return;
    db.from("ats_plantillas_whatsapp").select("id,nombre,texto,predeterminada").order("nombre").then(({ data }: any) => {
      const l: PlantillaWhatsapp[] = data || [];
      setPlantillas(l);
      setElegida(l.find((p) => p.predeterminada)?.id ?? l[0]?.id ?? ESTANDAR);
    });
  }, [datos]);

  const texto = useMemo(() => {
    if (!datos) return "";
    const p = plantillas.find((x) => x.id === elegida);
    return aplicarPlantillaWhatsapp(p?.texto ?? PLANTILLA_WHATSAPP_DEFAULT, datos);
  }, [datos, plantillas, elegida]);

  return (
    <Dialog open={!!datos} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Invitar por WhatsApp</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Label>Plantilla</Label>
          <Select value={elegida} onValueChange={setElegida}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {plantillas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              {plantillas.length === 0 && <SelectItem value={ESTANDAR}>Mensaje estándar</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">{texto}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onEnviar(texto)}><MessageCircle className="mr-1 h-4 w-4" /> Enviar por WhatsApp</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
