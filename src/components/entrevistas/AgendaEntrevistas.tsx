import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Phone, UserX, XCircle } from "lucide-react";
import {
  ENTREVISTA_ESTADO_LABEL,
  Entrevista,
  EntrevistaEstado,
  PuestoReclutamiento,
  Slot,
  hhmm,
} from "./entrevistasTypes";

const db = supabase as any;

interface Props {
  soloLectura?: boolean;
  refrescar?: number;
}

const estadoVariante = (e: EntrevistaEstado) =>
  e === "confirmada" ? "default" : e === "realizada" ? "secondary" : e === "cancelada" || e === "no_asistio" ? "destructive" : "outline";

export default function AgendaEntrevistas({ soloLectura, refrescar }: Props) {
  const [vista, setVista] = useState("hoy");
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [puestos, setPuestos] = useState<PuestoReclutamiento[]>([]);
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [detalle, setDetalle] = useState<Entrevista | null>(null);
  const [cargando, setCargando] = useState(true);

  const rango = useMemo(() => {
    const hoy = new Date();
    if (vista === "hoy") return { desde: hoy, hasta: hoy };
    if (vista === "semana") {
      const ini = startOfWeek(hoy, { weekStartsOn: 1 });
      return { desde: ini, hasta: addDays(ini, 6) };
    }
    return { desde: hoy, hasta: addDays(hoy, 60) };
  }, [vista]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const desde = filtroFecha || format(rango.desde, "yyyy-MM-dd");
      const hasta = filtroFecha || format(rango.hasta, "yyyy-MM-dd");
      const [{ data: ents }, { data: sl }, { data: ps }] = await Promise.all([
        db
          .from("entrevistas")
          .select("*, candidatos(nombre, apellido, telefono), reclutamiento_puestos(nombre)")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha")
          .order("hora_inicio"),
        db
          .from("entrevistas_slots")
          .select("*")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha")
          .order("hora_inicio"),
        db.from("reclutamiento_puestos").select("*").order("orden"),
      ]);
      setEntrevistas(ents || []);
      setSlots(sl || []);
      setPuestos(ps || []);
    } catch (e: any) {
      toast.error("No se pudo cargar la agenda: " + (e.message || e));
    } finally {
      setCargando(false);
    }
  }, [rango, filtroFecha]);

  useEffect(() => {
    cargar();
  }, [cargar, refrescar]);

  const cambiarEstado = async (ent: Entrevista, estado: EntrevistaEstado) => {
    const { error } = await db.from("entrevistas").update({ estado }).eq("id", ent.id);
    if (error) return toast.error(error.message);
    toast.success("Entrevista actualizada");
    setDetalle(null);
    cargar();
  };

  const cancelar = async (ent: Entrevista) => {
    const { error } = await db.rpc("entrevista_liberar_slot", { _entrevista_id: ent.id });
    if (error) return toast.error(error.message);
    toast.success("Entrevista cancelada y horario liberado");
    setDetalle(null);
    cargar();
  };

  const entrevistasFiltradas = entrevistas.filter(
    (e) =>
      (filtroPuesto === "todos" || e.puesto_id === filtroPuesto) &&
      (filtroEstado === "todos" || e.estado === filtroEstado)
  );

  const fechas = Array.from(
    new Set([...entrevistasFiltradas.map((e) => e.fecha), ...slots.map((s) => s.fecha)])
  ).sort();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1">
            <Label className="text-xs">Fecha puntual</Label>
            <Input
              type="date"
              className="w-40"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Puesto</Label>
            <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {puestos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(ENTREVISTA_ESTADO_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtroFecha && (
            <Button variant="ghost" onClick={() => setFiltroFecha("")}>
              Limpiar fecha
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs value={vista} onValueChange={setVista}>
        <TabsList>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="proximas">Próximas</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>
        <TabsContent value="calendario" className="mt-4">
          <CalendarioEntrevistas refrescar={refrescar} onSeleccionar={setDetalle} />
        </TabsContent>
        <TabsContent value={vista === "calendario" ? "__none" : vista} className="mt-4 space-y-4">
          {cargando ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : fechas.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No hay entrevistas ni horarios en este período.
              </CardContent>
            </Card>
          ) : (
            fechas.map((fecha) => {
              const delDia = entrevistasFiltradas.filter((e) => e.fecha === fecha);
              const libres = slots.filter((s) => s.fecha === fecha && s.estado === "disponible");
              const items = [
                ...delDia.map((e) => ({ hora: e.hora_inicio, tipo: "entrevista" as const, ent: e })),
                ...libres.map((s) => ({ hora: s.hora_inicio, tipo: "libre" as const, slot: s })),
              ].sort((a, b) => a.hora.localeCompare(b.hora));

              return (
                <Card key={fecha}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base uppercase">
                      {format(new Date(fecha + "T00:00:00"), "EEEE d", { locale: es })}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(fecha + "T00:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {items.map((it, i) =>
                      it.tipo === "entrevista" ? (
                        <button
                          key={it.ent.id}
                          onClick={() => setDetalle(it.ent)}
                          className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-accent/40"
                        >
                          <span className="w-16 font-semibold">{hhmm(it.hora)}</span>
                          <span className="font-medium">
                            {it.ent.candidatos?.nombre} {it.ent.candidatos?.apellido ?? ""}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {it.ent.reclutamiento_puestos?.nombre ?? "Sin puesto"}
                          </span>
                          {it.ent.candidatos?.telefono && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" /> {it.ent.candidatos.telefono}
                            </span>
                          )}
                          <Badge variant={estadoVariante(it.ent.estado)} className="ml-auto">
                            {ENTREVISTA_ESTADO_LABEL[it.ent.estado]}
                          </Badge>
                        </button>
                      ) : (
                        <div key={`${it.slot.id}-${i}`} className="flex items-center gap-3 py-3">
                          <span className="w-16 font-semibold text-muted-foreground">{hhmm(it.hora)}</span>
                          <Badge variant="secondary">Disponible</Badge>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detalle?.candidatos?.nombre} {detalle?.candidatos?.apellido ?? ""}
            </DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>Puesto:</strong> {detalle.reclutamiento_puestos?.nombre ?? "Sin puesto"}
              </p>
              <p>
                <strong>Teléfono:</strong> {detalle.candidatos?.telefono ?? "—"}
              </p>
              <p>
                <strong>Cuándo:</strong>{" "}
                {format(new Date(detalle.fecha + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })} ·{" "}
                {hhmm(detalle.hora_inicio)} a {hhmm(detalle.hora_fin)}
              </p>
              <p>
                <strong>Lugar:</strong> {detalle.direccion || "Sin definir"}
              </p>
              <p>
                <strong>Estado:</strong> {ENTREVISTA_ESTADO_LABEL[detalle.estado]}
              </p>
              {!soloLectura && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" className="gap-2" onClick={() => cambiarEstado(detalle, "realizada")}>
                    <CheckCircle2 className="h-4 w-4" /> Realizada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => cambiarEstado(detalle, "no_asistio")}
                  >
                    <UserX className="h-4 w-4" /> No asistió
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-2" onClick={() => cancelar(detalle)}>
                    <XCircle className="h-4 w-4" /> Cancelar y liberar horario
                  </Button>
                </div>
              )}
              {!soloLectura && (
                <p className="text-xs text-muted-foreground">
                  Para reprogramar, cancelá la entrevista (el horario queda libre) y volvé a invitar al
                  candidato.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
