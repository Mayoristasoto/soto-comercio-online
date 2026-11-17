import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageCircle, RotateCcw, Save } from "lucide-react";
import {
  PLANTILLA_WHATSAPP_DEFAULT, VARIABLES_WHATSAPP, aplicarPlantillaWhatsapp, plantillaTieneEnlace,
} from "@/lib/ats";

export interface DatosWhatsapp {
  numero: string;
  link: string;
  nombre: string;
  apellido: string;
  puesto: string;
  plantilla: string | null;
}

interface Props {
  datos: DatosWhatsapp | null;
  onClose: () => void;
  onEnviar: (texto: string) => void;
  onGuardarPlantilla: (plantilla: string) => Promise<boolean>;
}

export default function WhatsappPlantillaDialog({ datos, onClose, onEnviar, onGuardarPlantilla }: Props) {
  const [plantilla, setPlantilla] = useState("");
  const [guardada, setGuardada] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [puesto, setPuesto] = useState("");
  const [textoManual, setTextoManual] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!datos) return;
    const p = datos.plantilla?.trim() ? datos.plantilla : PLANTILLA_WHATSAPP_DEFAULT;
    setPlantilla(p); setGuardada(p);
    setNombre(datos.nombre); setApellido(datos.apellido); setPuesto(datos.puesto);
    setTextoManual(null);
  }, [datos]);

  const generado = useMemo(
    () => aplicarPlantillaWhatsapp(plantilla, { nombre, apellido, puesto, link: datos?.link || "" }),
    [plantilla, nombre, apellido, puesto, datos?.link],
  );
  const texto = textoManual ?? generado;
  const sinEnlace = datos ? !texto.includes(datos.link) : false;
  const cambiosSinGuardar = plantilla !== guardada;

  const insertarVariable = (clave: string) => {
    const el = ref.current;
    const ini = el?.selectionStart ?? plantilla.length;
    const fin = el?.selectionEnd ?? plantilla.length;
    const nueva = plantilla.slice(0, ini) + clave + plantilla.slice(fin);
    setPlantilla(nueva); setTextoManual(null);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + clave.length, ini + clave.length); });
  };

  const guardar = async () => {
    setGuardando(true);
    const ok = await onGuardarPlantilla(plantilla);
    setGuardando(false);
    if (ok) setGuardada(plantilla);
  };

  return (
    <Dialog open={!!datos} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Invitación por WhatsApp</DialogTitle></DialogHeader>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Datos de este postulante</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Nombre</Label><Input value={nombre} onChange={(e) => { setNombre(e.target.value); setTextoManual(null); }} /></div>
                <div className="space-y-1"><Label className="text-xs">Apellido</Label><Input value={apellido} onChange={(e) => { setApellido(e.target.value); setTextoManual(null); }} /></div>
                <div className="col-span-2 space-y-1"><Label className="text-xs">Puesto</Label><Input value={puesto} onChange={(e) => { setPuesto(e.target.value); setTextoManual(null); }} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Estos cambios son solo para este mensaje.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Plantilla</p>
                {cambiosSinGuardar && <Badge variant="outline">Cambios sin guardar</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">
                {VARIABLES_WHATSAPP.map((v) => (
                  <Button key={v.clave} type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => insertarVariable(v.clave)}>
                    + {v.etiqueta}
                  </Button>
                ))}
              </div>
              <Textarea ref={ref} rows={12} className="font-mono text-xs" value={plantilla} onChange={(e) => { setPlantilla(e.target.value); setTextoManual(null); }} />
              {!plantillaTieneEnlace(plantilla) && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> La plantilla no tiene el enlace de reserva.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={guardar} disabled={!cambiosSinGuardar || guardando || !plantilla.trim()}>
                  <Save className="mr-1 h-4 w-4" /> Guardar como plantilla
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setPlantilla(PLANTILLA_WHATSAPP_DEFAULT); setTextoManual(null); }}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Volver al mensaje estándar
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Mensaje que se va a enviar</p>
              {textoManual !== null && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTextoManual(null)}>Descartar retoques</Button>
              )}
            </div>
            <Textarea rows={20} value={texto} onChange={(e) => setTextoManual(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Podés retocar este texto solo para este envío; la plantilla no cambia.
            </p>
            {sinEnlace && (
              <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> El mensaje no incluye el enlace de reserva: el postulante no podrá elegir turno.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onEnviar(texto)} disabled={!texto.trim()}><MessageCircle className="mr-1 h-4 w-4" /> Abrir WhatsApp</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
