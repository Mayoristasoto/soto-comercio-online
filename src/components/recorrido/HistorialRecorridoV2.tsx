import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, ImagePlus, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";

interface Props {
  puntoId?: string | null;
  zonaId?: string | null;
  titulo: string;
}

interface Actividad {
  id: string;
  accion: string;
  estado: string | null;
  observaciones: string | null;
  usuario_id: string | null;
  created_at: string;
}

const ACCION: Record<string, string> = {
  registrado: "Registró el control",
  calificacion_actualizada: "Cambió la calificación",
  observacion_actualizada: "Actualizó la observación",
  foto_agregada: "Agregó una foto",
  actualizado: "Actualizó el control",
};

const ESTADO: Record<string, string> = {
  cumple: "Cumple",
  parcial: "Parcial",
  no_cumple: "No cumple",
};

export function HistorialRecorridoV2({ puntoId, zonaId, titulo }: Props) {
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const cargar = async () => {
      setCargando(true);
      let query = supabase
        .from("recorrido_hallazgo_actividad")
        .select("id, accion, estado, observaciones, usuario_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      query = puntoId ? query.eq("punto_id", puntoId) : query.eq("zona_id", zonaId ?? "");
      const { data } = await query;
      const lista = (data as Actividad[]) ?? [];
      setActividades(lista);

      const ids = [...new Set(lista.map((a) => a.usuario_id).filter((id): id is string => Boolean(id)))];
      if (ids.length) {
        const { data: personas } = await supabase.from("empleados").select("user_id, nombre, apellido").in("user_id", ids);
        setUsuarios(Object.fromEntries((personas ?? []).map((p) => [p.user_id, `${p.nombre} ${p.apellido}`.trim()])));
      } else {
        setUsuarios({});
      }
      setCargando(false);
    };
    cargar();
  }, [open, puntoId, zonaId]);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <History className="mr-1 h-4 w-4" /> Línea de tiempo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Línea de tiempo — {titulo}</DialogTitle></DialogHeader>
          {cargando && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          {!cargando && actividades.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados.</p>}
          <div className="relative space-y-0 pl-5 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-border">
            {actividades.map((a) => {
              const Icono = a.accion === "foto_agregada" ? ImagePlus : a.accion === "observacion_actualizada" ? MessageSquareText : ShieldCheck;
              return (
                <div key={a.id} className="relative pb-5 pl-5">
                  <span className="absolute -left-5 top-1 grid h-5 w-5 place-items-center rounded-full border bg-background"><Icono className="h-3 w-3" /></span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{usuarios[a.usuario_id ?? ""] ?? "Usuario del sistema"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-AR")}</span>
                    {a.estado && <Badge variant="outline">{ESTADO[a.estado] ?? a.estado}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{ACCION[a.accion] ?? a.accion}</p>
                  {a.observaciones && <p className="mt-1 whitespace-pre-wrap text-sm">{a.observaciones}</p>}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}