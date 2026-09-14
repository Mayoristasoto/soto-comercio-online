import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ESTADO_HALLAZGO_LABEL,
  ESTADO_SEGUIMIENTO_LABEL,
  type EstadoHallazgo,
  type RecorridoHallazgo,
} from "./recorridoTypes";
import { HistorialPunto } from "./HistorialPunto";

interface Sucursal { id: string; nombre: string }
interface Empleado { id: string; nombre: string; apellido: string; sucursal_id: string | null }

interface Props {
  sucursales: Sucursal[];
  empleados: Empleado[];
  esAdmin: boolean;
}

/** Panel de hallazgos detectados: no cumple / parcial, con asignación de tarea por admin_rrhh */
export function HallazgosAbiertos({ sucursales, empleados, esAdmin }: Props) {
  const [hallazgos, setHallazgos] = useState<RecorridoHallazgo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fSucursal, setFSucursal] = useState("todas");
  const [fEstado, setFEstado] = useState<string>("pendientes");
  const [asignando, setAsignando] = useState<RecorridoHallazgo | null>(null);
  const [empleadoSel, setEmpleadoSel] = useState("none");
  const [fechaLimite, setFechaLimite] = useState("");
  const [detalleTarea, setDetalleTarea] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const { data } = await supabase
      .from("recorrido_hallazgos")
      .select("*")
      .in("estado", ["no_cumple", "parcial"])
      .order("created_at", { ascending: false })
      .limit(300);
    setHallazgos((data as RecorridoHallazgo[]) ?? []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const nombreSucursal = (id: string | null) => sucursales.find((s) => s.id === id)?.nombre ?? "-";

  const filtrados = useMemo(
    () =>
      hallazgos.filter((h) => {
        if (fSucursal !== "todas" && h.sucursal_id !== fSucursal) return false;
        const seg = h.estado_seguimiento ?? "abierto";
        if (fEstado === "pendientes") return seg !== "resuelto";
        if (fEstado === "todos") return true;
        return seg === fEstado;
      }),
    [hallazgos, fSucursal, fEstado]
  );

  const abrirAsignacion = (h: RecorridoHallazgo) => {
    setAsignando(h);
    setDetalleTarea(
      `${h.zona_nombre ?? ""}${h.punto_nombre ? ` · ${h.punto_nombre}` : ""} — ${h.criterio_nombre ?? ""}` +
        (h.observaciones ? `\n${h.observaciones}` : "")
    );
    const sugerido = empleados.find((e) => e.sucursal_id === h.sucursal_id);
    setEmpleadoSel(sugerido?.id ?? "none");
    setFechaLimite("");
  };

  const crearTarea = async () => {
    if (!asignando) return;
    if (empleadoSel === "none") return toast.error("Elegí a quién asignar la tarea");
    setGuardando(true);
    const titulo = `Corregir: ${asignando.criterio_nombre ?? "hallazgo"} — ${asignando.punto_nombre ?? asignando.zona_nombre ?? "salón"}`;
    const { data: tarea, error } = await supabase
      .from("tareas")
      .insert({
        titulo,
        descripcion: detalleTarea,
        asignado_a: empleadoSel,
        fecha_limite: fechaLimite || null,
        prioridad: asignando.estado === "no_cumple" ? "alta" : "media",
        estado: "pendiente",
      })
      .select("id")
      .single();
    if (error || !tarea) {
      setGuardando(false);
      return toast.error("No se pudo crear la tarea");
    }
    await supabase
      .from("recorrido_hallazgos")
      .update({ tarea_id: tarea.id, estado_seguimiento: "en_tarea" })
      .eq("id", asignando.id);
    setGuardando(false);
    setAsignando(null);
    toast.success("Tarea asignada");
    cargar();
  };

  const marcarResuelto = async (h: RecorridoHallazgo) => {
    await supabase
      .from("recorrido_hallazgos")
      .update({ estado_seguimiento: "resuelto", resuelto_at: new Date().toISOString() })
      .eq("id", h.id);
    cargar();
  };

  if (cargando) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={fSucursal} onValueChange={setFSucursal}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las sucursales</SelectItem>
            {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fEstado} onValueChange={setFEstado}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendientes">Pendientes</SelectItem>
            <SelectItem value="abierto">Sin tarea</SelectItem>
            <SelectItem value="en_tarea">Con tarea asignada</SelectItem>
            <SelectItem value="resuelto">Resueltos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 && <p className="text-sm text-muted-foreground py-6">No hay hallazgos con estos filtros.</p>}

      <div className="space-y-2">
        {filtrados.map((h) => {
          const seg = (h.estado_seguimiento ?? "abierto") as keyof typeof ESTADO_SEGUIMIENTO_LABEL;
          return (
            <Card key={h.id}>
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={h.estado === "no_cumple" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"}
                    >
                      {h.estado ? ESTADO_HALLAZGO_LABEL[h.estado as EstadoHallazgo] : "-"}
                    </Badge>
                    <span className="font-medium text-sm">{h.criterio_nombre}</span>
                    <span className="text-sm text-muted-foreground">
                      {h.zona_nombre}{h.punto_nombre ? ` · ${h.punto_nombre}` : ""} — {nombreSucursal(h.sucursal_id)}
                    </span>
                    <Badge variant="secondary" className="text-xs">{ESTADO_SEGUIMIENTO_LABEL[seg] ?? seg}</Badge>
                  </div>
                  {h.observaciones && <p className="text-xs text-muted-foreground mt-1">{h.observaciones}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <HistorialPunto
                    puntoId={h.punto_id}
                    zonaId={h.zona_id}
                    titulo={`${h.zona_nombre ?? ""}${h.punto_nombre ? ` · ${h.punto_nombre}` : ""}`}
                  />
                  {esAdmin && seg !== "resuelto" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => abrirAsignacion(h)}>
                        <ClipboardList className="h-4 w-4 mr-1" /> Asignar tarea
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => marcarResuelto(h)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Resuelto
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!asignando} onOpenChange={(o) => !o && setAsignando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar tarea al encargado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={empleadoSel} onValueChange={setEmpleadoSel}>
              <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Elegir responsable</SelectItem>
                {empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
            <Textarea value={detalleTarea} onChange={(e) => setDetalleTarea(e.target.value)} rows={4} />
            <Button className="w-full" onClick={crearTarea} disabled={guardando}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Crear tarea
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
