import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface SlotLibre { slot_id: string; fecha: string; hora_inicio: string; hora_fin: string }

export default function AutogestionCharlaRRHH({ empleadoId, onVolver }: { empleadoId: string; onVolver: () => void }) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<SlotLibre[]>([]);
  const [cargando, setCargando] = useState(true);
  const [elegido, setElegido] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (supabase as any).rpc("kiosk_slots_charla").then(({ data }: any) => {
      setSlots(data || []);
      setCargando(false);
    });
  }, []);

  const porDia = useMemo(() => {
    const m: Record<string, SlotLibre[]> = {};
    slots.forEach((s) => (m[s.fecha] ||= []).push(s));
    return m;
  }, [slots]);

  const reservar = async () => {
    if (!elegido) return;
    setEnviando(true);
    const { data, error } = await (supabase as any).rpc("kiosk_reservar_charla", {
      p_empleado_id: empleadoId,
      p_slot_id: elegido,
      p_motivo: motivo || null,
    });
    setEnviando(false);
    if (error || !data?.ok) {
      toast({ title: "No se pudo reservar", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Charla reservada", description: "RRHH te espera en el horario elegido." });
    onVolver();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-6 w-6" /> Hablar con RRHH</CardTitle>
          <Button variant="outline" onClick={onVolver}>Volver</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cargando ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : slots.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Por ahora no hay horarios disponibles. Probá más adelante.</p>
        ) : (
          <>
            <p className="text-muted-foreground">Elegí un horario:</p>
            <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {Object.entries(porDia).map(([fecha, lista]) => (
                <div key={fecha}>
                  <p className="mb-2 font-semibold capitalize">
                    {format(new Date(fecha + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lista.map((s) => (
                      <Button
                        key={s.slot_id}
                        size="lg"
                        variant={elegido === s.slot_id ? "default" : "outline"}
                        onClick={() => setElegido(s.slot_id)}
                      >
                        {s.hora_inicio.slice(0, 5)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Textarea
              rows={2}
              placeholder="¿Sobre qué querés hablar? (opcional, solo lo ve RRHH)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={300}
            />
            <Button size="lg" className="w-full" disabled={!elegido || enviando} onClick={reservar}>
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reservar charla"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
