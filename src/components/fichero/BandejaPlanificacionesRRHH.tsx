import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

interface PlanPendiente {
  id: string;
  nombre: string | null;
  fecha_inicio_semana: string;
  estado: string | null;
  notas: string | null;
  motivo_rechazo: string | null;
  sucursal_id: string | null;
  sucursales?: { nombre: string } | null;
  empleados?: { nombre: string; apellido: string } | null;
  totalTramos?: number;
  totalHoras?: number;
  totalExtras?: number;
}

const fechaCorta = (f: string) => f.slice(8, 10) + "/" + f.slice(5, 7) + "/" + f.slice(0, 4);

const horasEntre = (entrada: string, salida: string) => {
  const [he, me] = String(entrada).slice(0, 5).split(":").map(Number);
  const [hs, ms] = String(salida).slice(0, 5).split(":").map(Number);
  let min = hs * 60 + ms - (he * 60 + me);
  if (min < 0) min += 24 * 60;
  return min / 60;
};

/** Bandeja de RRHH para validar las planificaciones enviadas por los encargados */
export function BandejaPlanificacionesRRHH({ onCambio }: { onCambio?: () => void }) {
  const { toast } = useToast();
  const [planes, setPlanes] = useState<PlanPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [rechazo, setRechazo] = useState<PlanPendiente | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("planificacion_semanal")
        .select(
          "id, nombre, fecha_inicio_semana, estado, notas, motivo_rechazo, sucursal_id, sucursales(nombre), empleados!planificacion_semanal_creado_por_fkey(nombre, apellido)"
        )
        .eq("estado", "pendiente_aprobacion")
        .order("fecha_inicio_semana", { ascending: true });
      if (error) throw error;

      const lista = (data || []) as any[] as PlanPendiente[];

      // Totales por planificación
      for (const p of lista) {
        const { data: det } = await supabase
          .from("planificacion_semanal_detalle")
          .select("hora_entrada, hora_salida, horas_extras")
          .eq("planificacion_id", p.id);
        const filas = det || [];
        p.totalTramos = filas.length;
        p.totalHoras = filas.reduce(
          (a: number, r: any) => a + horasEntre(r.hora_entrada, r.hora_salida),
          0
        );
        p.totalExtras = filas.reduce((a: number, r: any) => a + Number(r.horas_extras || 0), 0);
      }
      setPlanes(lista);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al cargar pendientes", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resolver = async (plan: PlanPendiente, aprobar: boolean, motivoTexto?: string) => {
    setProcesando(true);
    try {
      const { error } = await (supabase as any).rpc("resolver_planificacion", {
        p_planificacion_id: plan.id,
        p_aprobar: aprobar,
        p_motivo: motivoTexto ?? null,
      });
      if (error) throw error;
      toast({
        title: aprobar ? "Planificación aprobada" : "Planificación rechazada",
        description: `${plan.sucursales?.nombre || "Sucursal"} · semana del ${fechaCorta(
          plan.fecha_inicio_semana
        )}`,
      });
      setRechazo(null);
      setMotivo("");
      await cargar();
      onCambio?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Planificaciones por validar
            {planes.length > 0 && <Badge variant="destructive">{planes.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Semanas enviadas por los encargados. Solo RRHH puede aprobarlas y aplicarlas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {!loading && planes.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay planificaciones pendientes.</p>
          )}
          {planes.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{p.sucursales?.nombre || "Sin sucursal"}</span>
              <Badge variant="outline">Semana {fechaCorta(p.fecha_inicio_semana)}</Badge>
              {p.empleados && (
                <span className="text-xs text-muted-foreground">
                  Enviada por {p.empleados.apellido}, {p.empleados.nombre}
                </span>
              )}
              <Badge variant="secondary">{p.totalTramos ?? 0} tramos</Badge>
              <Badge variant="secondary">{(p.totalHoras ?? 0).toFixed(1)} h</Badge>
              <Badge variant="secondary">{(p.totalExtras ?? 0).toFixed(1)} h extras</Badge>
              {p.notas && <span className="text-xs text-muted-foreground">{p.notas}</span>}
              <div className="ml-auto flex gap-2">
                <Button size="sm" disabled={procesando} onClick={() => resolver(p, true)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={procesando}
                  onClick={() => {
                    setRechazo(p);
                    setMotivo("");
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rechazar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!rechazo} onOpenChange={(o) => !o && setRechazo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar planificación</DialogTitle>
            <DialogDescription>
              El encargado va a ver el motivo y podrá corregir la semana.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. faltan 3 empleados a la tarde en José Martí"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={procesando}
              onClick={() => rechazo && resolver(rechazo, false, motivo.trim() || undefined)}
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BandejaPlanificacionesRRHH;
