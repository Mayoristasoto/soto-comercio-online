import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { PlanoCanvas, type PinPunto } from "@/components/recorrido/PlanoCanvas";
import { HallazgoFotos } from "@/components/recorrido/HallazgoFotos";
import { HistorialRecorridoV2 } from "@/components/recorrido/HistorialRecorridoV2";
import { RecorridoModoGuiado } from "@/components/recorrido/RecorridoModoGuiado";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatArgentinaDateTime } from "@/lib/dateUtils";
import { ActividadesPersonalCard } from "@/components/checklist/ActividadesPersonalCard";
import { EncuestaClienteDialog } from "@/components/encuestas/EncuestaClienteDialog";
import {
  ESTADO_HALLAZGO_LABEL,
  TIPO_ESPACIO_LABEL,
  criterioAplica,
  peorEstado,
  type EstadoHallazgo,
  type TipoEspacio,
  type Recorrido,
  type RecorridoCriterio,
  type RecorridoHallazgo,
  type RecorridoPlano,
  type RecorridoPunto,
  type RecorridoZona,
} from "@/components/recorrido/recorridoTypes";

const RecorridoDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recorrido, setRecorrido] = useState<Recorrido | null>(null);
  const [plano, setPlano] = useState<RecorridoPlano | null>(null);
  const [zonas, setZonas] = useState<RecorridoZona[]>([]);
  const [puntos, setPuntos] = useState<RecorridoPunto[]>([]);
  const [criterios, setCriterios] = useState<RecorridoCriterio[]>([]);
  const [hallazgos, setHallazgos] = useState<RecorridoHallazgo[]>([]);
  const [zonaSel, setZonaSel] = useState<RecorridoZona | null>(null);
  const [puntoSel, setPuntoSel] = useState<RecorridoPunto | null>(null);
  const [pinTmp, setPinTmp] = useState<{ x: number; y: number } | null>(null);
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [marcandoTodo, setMarcandoTodo] = useState(false);
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const isMobile = useIsMobile();
  const [modoGuiado, setModoGuiado] = useState<boolean | null>(null);
  const guiadoActivo = modoGuiado ?? isMobile;

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
      const listaZonas = (zo as RecorridoZona[]) ?? [];
      setZonas(listaZonas);
      if (listaZonas.length) {
        const { data: pt } = await supabase
          .from("recorrido_puntos")
          .select("*")
          .in("zona_id", listaZonas.map((z) => z.id))
          .order("orden");
        setPuntos((pt as RecorridoPunto[]) ?? []);
      } else {
        setPuntos([]);
      }
    }
  };

  useEffect(() => { cargar(); }, [id]);

  const puntosDeZona = (zonaId: string) => puntos.filter((p) => p.zona_id === zonaId);

  /** Criterios que aplican al tipo de espacio del punto (pasillo completo = todos) */
  const criteriosPara = (punto: RecorridoPunto | null) =>
    criterios.filter((c) => criterioAplica(c, punto?.tipo_espacio ?? null));

  const hallazgoDe = (zonaId: string, criterioId: string, puntoId: string | null) =>
    hallazgos.find(
      (h) => h.zona_id === zonaId && h.criterio_id === criterioId && (h.punto_id ?? null) === (puntoId ?? null)
    );

  const marcar = async (
    zona: RecorridoZona,
    punto: RecorridoPunto | null,
    criterio: RecorridoCriterio,
    estado: EstadoHallazgo
  ) => {
    if (soloLectura) return;
    const existente = hallazgoDe(zona.id, criterio.id, punto?.id ?? null);
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
          punto_id: punto?.id ?? null,
          punto_nombre: punto?.nombre ?? null,
          sucursal_id: recorrido?.sucursal_id ?? null,
          criterio_id: criterio.id,
          criterio_nombre: criterio.nombre,
          estado,
          punto_x: pinTmp?.x ?? (punto ? punto.x + punto.width / 2 : null),
          punto_y: pinTmp?.y ?? (punto ? punto.y + punto.height / 2 : null),
          orden: hallazgos.length,
        })
        .select("*")
        .single();
      if (error || !data) return toast.error("No se pudo guardar");
      setHallazgos((prev) => [...prev, data as RecorridoHallazgo]);
      setPinTmp(null);
    }
  };

  // Marca todos los criterios de una góndola (o pasillo) de una sola vez
  const marcarGrupo = async (zona: RecorridoZona, punto: RecorridoPunto | null, estado: EstadoHallazgo) => {
    if (soloLectura) return;
    const aplicables = criteriosPara(punto);
    const existentes = aplicables
      .map((c) => hallazgoDe(zona.id, c.id, punto?.id ?? null))
      .filter(Boolean) as RecorridoHallazgo[];
    const faltantes = aplicables.filter((c) => !hallazgoDe(zona.id, c.id, punto?.id ?? null));

    if (existentes.length) {
      const ids = existentes.map((h) => h.id);
      const { error } = await supabase.from("recorrido_hallazgos").update({ estado }).in("id", ids);
      if (error) return toast.error("No se pudo actualizar");
      setHallazgos((prev) => prev.map((h) => (ids.includes(h.id) ? { ...h, estado } : h)));
    }

    if (faltantes.length) {
      const filas = faltantes.map((c, i) => ({
        recorrido_id: id,
        zona_id: zona.id,
        zona_nombre: zona.nombre,
        punto_id: punto?.id ?? null,
        punto_nombre: punto?.nombre ?? null,
        sucursal_id: recorrido?.sucursal_id ?? null,
        criterio_id: c.id,
        criterio_nombre: c.nombre,
        estado,
        punto_x: punto ? punto.x + punto.width / 2 : null,
        punto_y: punto ? punto.y + punto.height / 2 : null,
        orden: hallazgos.length + i,
      }));
      const { data, error } = await supabase.from("recorrido_hallazgos").insert(filas).select("*");
      if (error) return toast.error("No se pudo guardar");
      setHallazgos((prev) => [...prev, ...((data as RecorridoHallazgo[]) ?? [])]);
    }
  };

  const marcarTodo = async (estado: EstadoHallazgo) => {
    if (soloLectura) return;
    setMarcandoTodo(true);
    for (const z of zonas) {
      const pts = puntosDeZona(z.id);
      if (pts.length) {
        for (const p of pts) await marcarGrupo(z, p, estado);
      } else {
        await marcarGrupo(z, null, estado);
      }
    }
    setMarcandoTodo(false);
    toast.success("Se completaron todos los controles");
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

  const puntoEstados = useMemo(() => {
    const m: Record<string, EstadoHallazgo | null> = {};
    for (const p of puntos) {
      m[p.id] = peorEstado(hallazgos.filter((h) => h.punto_id === p.id).map((h) => h.estado));
    }
    return m;
  }, [puntos, hallazgos]);

  const pins: PinPunto[] = useMemo(
    () =>
      hallazgos
        .filter((h) => h.punto_x != null && h.punto_y != null && !h.punto_id)
        .map((h) => ({ x: h.punto_x!, y: h.punto_y!, estado: h.estado, label: `${h.zona_nombre} · ${h.criterio_nombre}` })),
    [hallazgos]
  );

  const elegirZona = (z: RecorridoZona) => {
    setZonaSel(z);
    setPuntoSel(puntosDeZona(z.id)[0] ?? null);
  };

  const onCanvasClick = (x: number, y: number, zona: RecorridoZona | null) => {
    if (soloLectura) return;
    if (zona) {
      elegirZona(zona);
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
    const hechos = hallazgos.filter((h) => h.zona_id === z.id).length;
    const pts = puntosDeZona(z.id);
    const objetivo = pts.length
      ? pts.reduce((acc, p) => acc + criteriosPara(p).length, 0)
      : criteriosPara(null).length;
    return `${hechos}/${objetivo}`;
  };

  const renderCriterios = (zona: RecorridoZona, punto: RecorridoPunto | null) =>
    criteriosPara(punto).map((c) => {
      const h = hallazgoDe(zona.id, c.id, punto?.id ?? null);
      return (
        <div key={`${punto?.id ?? zona.id}-${c.id}`} className="rounded-md border p-3 space-y-2">
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
                  onClick={() => marcar(zona, punto, c, est)}
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
    });

  const grupos = useMemo(() => {
    const out: { zona: RecorridoZona; punto: RecorridoPunto | null }[] = [];
    for (const z of zonas) {
      const pts = puntos.filter((p) => p.zona_id === z.id);
      if (pts.length) pts.forEach((p) => out.push({ zona: z, punto: p }));
      else out.push({ zona: z, punto: null });
    }
    return out;
  }, [zonas, puntos]);

  const totalControles = grupos.reduce((acc, g) => acc + criteriosPara(g.punto).length, 0);
  const hechosControles = hallazgos.length;

  if (!recorrido) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (guiadoActivo) {
    return (
      <RecorridoModoGuiado
        recorrido={recorrido}
        plano={plano}
        sucursalNombre={sucursalNombre}
        fechaTexto={formatArgentinaDateTime(recorrido.fecha_hora)}
        zonas={zonas}
        puntos={puntos}
        criterios={criterios}
        hallazgos={hallazgos}
        readOnly={soloLectura}
        cerrando={cerrando}
        onEstado={marcar}
        onGrupo={marcarGrupo}
        onObservaciones={guardarObs}
        onCerrar={cerrar}
        onReabrir={reabrir}
        onSalir={() => setModoGuiado(false)}
      />
    );
  }

  const puntosZona = zonaSel ? puntosDeZona(zonaSel.id) : [];
  const tipoPunto = puntoSel?.tipo_espacio
    ? TIPO_ESPACIO_LABEL[puntoSel.tipo_espacio as TipoEspacio] ?? puntoSel.tipo_espacio
    : null;
  const tituloPanel = zonaSel
    ? `Controlando: ${zonaSel.nombre}${puntoSel ? ` · ${tipoPunto ? `${tipoPunto} ` : ""}${puntoSel.nombre}` : ""}`
    : "Elegí un espacio en el plano";

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rrhh/recorrido")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold">{recorrido.titulo ?? "Recorrido"} — {sucursalNombre}</h1>
            <p className="text-sm text-muted-foreground">{formatArgentinaDateTime(recorrido.fecha_hora)}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setModoGuiado(true)}>
            <Smartphone className="h-4 w-4 mr-1" />
            Modo control
          </Button>
          <Button variant={vistaCompleta ? "secondary" : "outline"} size="sm" onClick={() => setVistaCompleta((v) => !v)}>
            {vistaCompleta ? "Ocultar vista completa" : "Ver todas las góndolas"}
          </Button>
          {!soloLectura && (
            <Button variant="outline" size="sm" onClick={() => marcarTodo("cumple")} disabled={marcandoTodo}>
              {marcandoTodo && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Marcar todo como cumple
            </Button>
          )}
          {soloLectura ? (
            <>
              <Badge>Completado</Badge>
              <Button variant="outline" size="sm" onClick={reabrir}>Reabrir</Button>
            </>
          ) : (
            <Button onClick={cerrar} disabled={cerrando}>
              {cerrando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Cerrar recorrido
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Plano — tocá una góndola para controlarla</CardTitle>
          </CardHeader>
          <CardContent>
            {plano ? (
              <PlanoCanvas
                plano={plano}
                zonas={zonas}
                zonaSeleccionadaId={zonaSel?.id}
                zonaEstados={zonaEstados}
                puntos={[]}
                puntoSeleccionadoId={puntoSel?.id}
                puntoEstados={puntoEstados}
                pins={pinTmp ? [...pins, { x: pinTmp.x, y: pinTmp.y }] : pins}
                onZonaClick={elegirZona}
                onPuntoClick={setPuntoSel}
                onCanvasClick={onCanvasClick}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Esta sucursal no tiene plano cargado. Cargalo desde Recorrido de Salón → Plano y zonas.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>{tituloPanel}</span>
              {zonaSel && (
                <HistorialRecorridoV2
                  puntoId={puntoSel?.id ?? null}
                  zonaId={puntoSel ? null : zonaSel.id}
                  titulo={`${zonaSel.nombre}${puntoSel ? ` · ${puntoSel.nombre}` : ""}`}
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!zonaSel && <p className="text-sm text-muted-foreground">Tocá una góndola azul del plano para evaluar sus criterios.</p>}
            {zonaSel && renderCriterios(zonaSel, puntoSel)}
          </CardContent>
        </Card>
      </div>

      {vistaCompleta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Todas las góndolas · {hechosControles}/{totalControles} controles marcados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grupos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no hay góndolas cargadas. Cargalas desde Recorrido de Salón → Plano y zonas.
              </p>
            )}
            {grupos.map(({ zona, punto }) => (
              <div key={`${zona.id}-${punto?.id ?? "zona"}`} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-sm">
                    {zona.nombre}{punto ? ` · ${punto.nombre}` : ""}
                  </span>
                  {!soloLectura && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => marcarGrupo(zona, punto, "cumple")}>
                        Todo cumple
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => marcarGrupo(zona, punto, "no_cumple")}>
                        Todo no cumple
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">{renderCriterios(zona, punto)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecorridoDetalle;
