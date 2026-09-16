import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Link2, MessageCircle } from "lucide-react";
import { Candidato, enlaceReserva, mensajeWhatsapp } from "./entrevistasTypes";

const db = supabase as any;

interface Props {
  candidato: Candidato | null;
  puestoNombre: string;
  onClose: () => void;
  onInvitado?: () => void;
}

export default function InvitarCandidatoDialog({ candidato, puestoNombre, onClose, onInvitado }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [plantilla, setPlantilla] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const generar = async () => {
    if (!candidato) return;
    setGenerando(true);
    try {
      const { data: cfgs } = await db
        .from("entrevistas_config")
        .select("id, mensaje_whatsapp")
        .order("created_at")
        .limit(1);
      const cfg = cfgs?.[0];
      setPlantilla(cfg?.mensaje_whatsapp ?? null);

      const { data: nuevoToken, error: errToken } = await db.rpc("entrevista_generar_token");
      if (errToken) throw errToken;

      const { data: user } = await supabase.auth.getUser();
      const { error } = await db.from("entrevistas_invitaciones").insert({
        candidato_id: candidato.id,
        config_id: cfg?.id ?? null,
        token: nuevoToken,
        creado_por: user?.user?.id ?? null,
      });
      if (error) throw error;

      await db.from("candidatos").update({ estado: "pendiente_reserva" }).eq("id", candidato.id);

      setToken(nuevoToken as string);
      onInvitado?.();
    } catch (e: any) {
      toast.error("No se pudo generar la invitación: " + (e.message || e));
    } finally {
      setGenerando(false);
    }
  };

  const mensaje = token ? mensajeWhatsapp(candidato?.nombre ?? "", puestoNombre, token, plantilla) : "";

  const copiar = async (texto: string, aviso: string) => {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  };

  return (
    <Dialog
      open={!!candidato}
      onOpenChange={(o) => {
        if (!o) {
          setToken(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a entrevista</DialogTitle>
          <DialogDescription>
            {candidato?.nombre} {candidato?.apellido ?? ""} · {puestoNombre || "Sin puesto"}
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <Button onClick={generar} disabled={generando} className="gap-2">
            <Link2 className="h-4 w-4" /> {generando ? "Generando…" : "Generar enlace de reserva"}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-success">Invitación generada</p>
            <Textarea readOnly value={mensaje} rows={12} className="text-sm" />
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2" onClick={() => copiar(mensaje, "Mensaje copiado")}>
                <Copy className="h-4 w-4" /> Copiar mensaje WhatsApp
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => copiar(enlaceReserva(token), "Enlace copiado")}
              >
                <Link2 className="h-4 w-4" /> Copiar enlace
              </Button>
              <Button variant="secondary" className="gap-2" disabled title="Próximamente">
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
