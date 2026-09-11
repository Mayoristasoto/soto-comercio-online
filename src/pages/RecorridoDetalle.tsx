import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PlanoCanvas, type PinPunto } from "@/components/recorrido/PlanoCanvas";
import { HallazgoFotos } from "@/components/recorrido/HallazgoFotos";
import {
  ESTADO_HALLAZGO_LABEL,
  peorEstado,
  type EstadoHallazgo,
  type Recorrido,
  type RecorridoCriterio,
  type RecorridoHallazgo,
  type RecorridoPlano,
  type RecorridoZona,
} from "@/components/recorrido/recorridoTypes";

const RecorridoDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recorrido, setRecorrido] = useState<Recorrido | null>(null);
  const [plano, setPlano] = useState<RecorridoPlano | null>(null);
  const [zonas, setZonas] = useState<RecorridoZona[]>([]);
  const [criterios, setCriterios] = useState<RecorridoCriterio[]>([]);
  const [hallazgos, setHallazgos] = useState<RecorridoHallazgo[]>([]);
  const [zonaSel, setZonaSel] = useState<RecorridoZona | null>(null);
  const [pinTmp, setPinTmp] = useState<{ x: number; y: number } | null>(null);
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [cerrando, setCerrando] = useState(false);

  const soloLectura = recorrido?.estado === "completado";

  const cargar = async () => {
    const { data: rec } = await supabase.from("recorridos").select("*").eq("id", id).single();
    if (!rec) return toast.error("Recorrido no encontrado");
    setRecorrido(rec as Recorrido);
    const [{ data: suc }, { data: cri }, { data: hal }] = await Promise.all([
      supabase.from("sucursales").select("nombre").eq("id", rec.sucursal_id).single(),
      supabase.from("recorrido_criterios").select("*").eq("activo", true).order("orden"),
      supabase.from("recorrido_hallazgos").select("*").eq("recorrido_id", id).order("orden"),
    ]);
    setSucursalNombre(suc?.nombre ?? "");
    setCriterios((cri as RecorridoCriterio[]) ?? []);
    setHallazgos((hal as RecorridoHallazgo[]) ?? []);

    const planoId = rec.plano_id;
    const planoQuery = planoId
      ? supabase.from("recorrido_planos").select("*").eq("id", planoId).maybeSingle()
      : supabase.from("recorrido_planos").select("*").eq("sucursal_id", rec.sucursal_id).eq("activo", true).maybeSingle();
    const { data: pl } = await planoQuery;
    if (pl) {
      setPlano(pl as RecorridoPlano);
      const { data: zo } = await supabase.from("recorrido_zonas").select("*").eq("plano_id", pl.id).order("orden");
      setZonas((zo as RecorridoZona[]) ?? []);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const hallazgoDe = (zonaId: string, criterioId: string) =>
    hallazgos.find((h) => h.zona_id === zonaId && h.criterio_id === criterioId);

  const marcar = async (zona: RecorridoZona, criterio: RecorridoCriterio, estado: EstadoHallazgo) => {
    if (soloLectura) return;
    const existente = hallazgoDe(zona.id, criterio.id);
    if (existente) {
      const { error } = await supabase.from("recorrido_hallazgos").update({ estado }).eq("id", existente.id);
      if (error) return toast.error("No se pudo actualizar");
      setHallazgos((prev) => prev.map((h) => (h.id === existente.id ? { ...h, estado } : h)));
    } else {
      const { data, error } = await supabase
        .from("recorrido_hallazgos")
        .insert({
          recorrido_id: id,
          zona_id: zona.id,
          zona_nombre: zona.nombre,
          criterio_id: criterio.id,
          criterio_nombre: criterio.nombre,
          estado,
          punto_x: pinTmp?.x ?? null,
          punto_y: pinTmp?.y ?? null,
          orden: hallazgos.length,
        })
        .select("*")
        .single();
      if (error || !data) return toast.error("No se pudo guardar");
      setHallazgos((prev) => [...prev, data as RecorridoHallazgo]);
      setPinTmp(null);
    }
  };

  const guardarObs = async (h: RecorridoHallazgo, obs: string) => {
    await supabase.from("recorrido_hallazgos").update({ observaciones: obs }).eq("id", h.id);
    setHallazgos((prev) => prev.map((x) => (x.id === h.id ? { ...x, observaciones: obs } : x)));
  };

  const zonaEstados = useMemo(() => {
    const m: Record<string, EstadoHallazgo | null> = {};
    for (const z of zonas) {
      m[z.id] = peorEstado(hallazgos.filter((h) => h.zona_id === z.id).map((h) => h.estado));
    }
    return m;
  }, [zonas, hallazgos]);

  const pins: PinPunto[] = useMemo(
    () =>
      hallazgos
        .filter((h) => h.punto_x != null && h.punto_y != null)
        .map((h) => ({ x: h.punto_x!, y: h.punto_y!, estado: h.estado, label: `${h.zona_nombre} · ${h.criterio_nombre}` })),
    [hallazgos]
  );

  const onCanvasClick = (x: number, y: number, zona: RecorridoZona | null) => {
    if (soloLectura) return;
    if (zona) {
      setZonaSel(zona);
    } else {
      setPinTmp({ x, y });
      toast.info("Punto marcado. Elegí la zona y criterio para asociarlo.", { duration: 2500 });
    }
  };

  const cerrar = async () => {
    setCerrando(true);
    const { error } = await supabase
      .from("recorridos")
      .update({ estado: "completado", cerrado_at: new Date().toISOString() })
      .eq("id", id);
    setCerrando(false);
    if (error) return toast.error("No se pudo cerrar el recorrido");
    toast.success("Recorrido cerrado");
    cargar();
  };

  const reabrir = async () => {
    await supabase.from("recorridos").update({ estado: "borrador", cerrado_at: null }).eq("id", id);
    toast.success("Recorrido reabierto");
    cargar();
  };

  const progreso = (z: RecorridoZona) => {
    const hechos = criterios.filter((c) => hallazgoDe(z.id, c.id)).length;
    return `${hechos}/${criterios.length}`;
  };

  if (!recorrido) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rrhh/recorrido")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold">{recorrido.titulo ?? "Recorrido"} — {sucursalNombre}</h1>
            <p className="text-sm text-muted-foreground">{new Date(recorrido.fecha_hora).toLocaleString("es-AR")}</p>
          </div>
        </div>
        {soloLectura ? (
          <div className="flex gap-2 items-center">
            <Badge>Completado</Badge>
            <Button variant="outline" size="sm" onClick={reabrir}>Reabrir</Button>
          </div>
        ) : (
          <Button onClick={cerrar} disabled={cerrando}>
            {cerrando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Cerrar recorrido
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Plano — tocá la zona que estás controlando</CardTitle>
          </CardHeader>
          <CardContent>
            {plano ? (
              <PlanoCanvas
                plano={plano}
                zonas={zonas}
                zonaSeleccionadaId={zonaSel?.id}
                zonaEstados={zonaEstados}
                pins={pinTmp ? [...pins, { x: pinTmp.x, y: pinTmp.y }] : pins}
                onZonaClick={setZonaSel}
                onCanvasClick={onCanvasClick}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Esta sucursal no tiene plano cargado. Cargalo desde Recorrido de Salón → Plano y zonas.</p>
            )}
            {zonas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {zonas.map((z) => (
                  <Button
                    key={z.id}
                    size="sm"
                    variant={zonaSel?.id === z.id ? "default" : "outline"}
                    onClick={() => setZonaSel(z)}
                  >
                    {z.nombre} <span className="ml-1 text-xs opacity-70">{progreso(z)}</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {zonaSel ? `Controlando: ${zonaSel.nombre}` : "Elegí una zona en el plano"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!zonaSel && <p className="text-sm text-muted-foreground">Tocá un pasillo del plano para evaluar los criterios.</p>}
            {zonaSel && criterios.map((c) => {
              const h = hallazgoDe(zonaSel.id, c.id);
              return (
                <div key={c.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-medium">{c.nombre}</span>
                    <div className="flex gap-1">
                      {(["cumple", "parcial", "no_cumple"] as EstadoHallazgo[]).map((est) => (
                        <Button
                          key={est}
                          size="sm"
                          variant={h?.estado === est ? "default" : "outline"}
                          className={
                            h?.estado === est
                              ? est === "cumple"
                                ? "bg-emerald-600 hover:bg-emerald-600"
                                : est === "parcial"
                                  ? "bg-amber-500 hover:bg-amber-500"
                                  : "bg-red-600 hover:bg-red-600"
                              : ""
                          }
                          onClick={() => marcar(zonaSel, c, est)}
                        >
                          {ESTADO_HALLAZGO_LABEL[est]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {h && (
                    <>
                      <Textarea
                        placeholder="Observaciones…"
                        defaultValue={h.observaciones ?? ""}
                        readOnly={soloLectura}
                        onBlur={(e) => guardarObs(h, e.target.value)}
                        rows={2}
                      />
                      <HallazgoFotos hallazgoId={h.id} readOnly={soloLectura} />
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecorridoDetalle;
