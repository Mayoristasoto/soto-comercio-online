import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HallazgoFotos } from "./HallazgoFotos";
import { PlanoCanvas, type PinPunto } from "./PlanoCanvas";
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
} from "./recorridoTypes";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  Lock,
  MapPin,
  MessageSquare,
  X,
} from "lucide-react";
import { HistorialRecorridoV2 } from "./HistorialRecorridoV2";

const ESTADOS: EstadoHallazgo[] = ["cumple", "parcial", "no_cumple"];

const ESTADO_BUTTON_CLASSES: Record<EstadoHallazgo, string> = {
  cumple: "bg-success text-success-foreground border-success hover:bg-success/90",
  parcial: "bg-warning text-warning-foreground border-warning hover:bg-warning/90",
  no_cumple: "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
};

const ESTADO_SOFT_CLASSES: Record<EstadoHallazgo, string> = {
  cumple: "bg-success/10 text-success border-success/30",
  parcial: "bg-warning/10 text-warning border-warning/30",
  no_cumple: "bg-destructive/10 text-destructive border-destructive/30",
};

interface GrupoControl {
  key: string;
  zona: RecorridoZona;
  punto: RecorridoPunto | null;
}

interface Props {
  recorrido: Recorrido;
  plano: RecorridoPlano | null;
  sucursalNombre: string;
  fechaTexto: string;
  zonas: RecorridoZona[];
  puntos: RecorridoPunto[];
  criterios: RecorridoCriterio[];
  hallazgos: RecorridoHallazgo[];
  readOnly: boolean;
  cerrando: boolean;
  onEstado: (
    zona: RecorridoZona,
    punto: RecorridoPunto | null,
    criterio: RecorridoCriterio,
    estado: EstadoHallazgo
  ) => Promise<unknown> | unknown;
  onGrupo: (zona: RecorridoZona, punto: RecorridoPunto | null, estado: EstadoHallazgo) => Promise<unknown> | unknown;
  onObservaciones: (hallazgo: RecorridoHallazgo, observaciones: string) => Promise<unknown> | unknown;
  onCerrar: () => Promise<unknown> | unknown;
  onReabrir: () => Promise<unknown> | unknown;
  onSalir: () => void;
}

const grupoKey = (zonaId: string, puntoId?: string | null) => `${zonaId}::${puntoId ?? "zona"}`;

const nombreGrupo = (grupo: GrupoControl) => {
  const tipo = grupo.punto?.tipo_espacio
    ? TIPO_ESPACIO_LABEL[grupo.punto.tipo_espacio as TipoEspacio] ?? grupo.punto.tipo_espacio
    : null;
  if (!grupo.punto) return grupo.zona.nombre;
  return `${grupo.zona.nombre} · ${tipo ? `${tipo} ` : ""}${grupo.punto.nombre}`;
};

export function RecorridoModoGuiado({
  recorrido,
  plano,
  sucursalNombre,
  fechaTexto,
  zonas,
  puntos,
  criterios,
  hallazgos,
  readOnly,
  cerrando,
  onEstado,
  onGrupo,
  onObservaciones,
  onCerrar,
  onReabrir,
  onSalir,
}: Props) {
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string | null>(null);
  const [indiceAbierto, setIndiceAbierto] = useState(false);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [obsAbiertas, setObsAbiertas] = useState<Record<string, boolean>>({});
  const [obsCriteriosAbiertas, setObsCriteriosAbiertas] = useState<Record<string, boolean>>({});
  const [fotosAbiertas, setFotosAbiertas] = useState<Record<string, boolean>>({});

  const grupos = useMemo<GrupoControl[]>(() => {
    const out: GrupoControl[] = [];
    zonas.forEach((zona) => {
      const pts = puntos.filter((p) => p.zona_id === zona.id);
      if (pts.length) {
        pts.forEach((punto) => out.push({ key: grupoKey(zona.id, punto.id), zona, punto }));
      } else {
        out.push({ key: grupoKey(zona.id), zona, punto: null });
      }
    });
    return out;
  }, [puntos, zonas]);

  const criteriosPara = (punto: RecorridoPunto | null) =>
    criterios.filter((criterio) => criterioAplica(criterio, punto?.tipo_espacio ?? null));

  const hallazgoDe = (grupo: GrupoControl, criterioId: string) =>
    hallazgos.find(
      (h) =>
        h.zona_id === grupo.zona.id &&
        h.criterio_id === criterioId &&
        (h.punto_id ?? null) === (grupo.punto?.id ?? null)
    );

  const estadoGrupo = (grupo: GrupoControl) =>
    peorEstado(
      hallazgos
        .filter((h) => h.zona_id === grupo.zona.id && (h.punto_id ?? null) === (grupo.punto?.id ?? null))
        .map((h) => h.estado)
    );

  const grupoCompleto = (grupo: GrupoControl) => {
    const aplicables = criteriosPara(grupo.punto);
    if (!aplicables.length) return false;
    return aplicables.every((criterio) => hallazgoDe(grupo, criterio.id)?.estado);
  };

  const grupoActivo = useMemo(() => {
    const seleccionado = grupos.find((g) => g.key === grupoSeleccionado);
    if (seleccionado) return seleccionado;
    return grupos.find((g) => !grupoCompleto(g)) ?? grupos[0] ?? null;
  }, [grupoSeleccionado, grupos, hallazgos, criterios]);

  const grupoActivoKey = grupoActivo?.key ?? null;
  const criteriosActivos = grupoActivo ? criteriosPara(grupoActivo.punto) : [];
  const gruposCompletos = grupos.filter(grupoCompleto).length;
  const totalCriterios = grupos.reduce((acc, grupo) => acc + criteriosPara(grupo.punto).length, 0);
  const criteriosMarcados = grupos.reduce(
    (acc, grupo) => acc + criteriosPara(grupo.punto).filter((criterio) => hallazgoDe(grupo, criterio.id)?.estado).length,
    0
  );
  const progreso = totalCriterios ? Math.round((criteriosMarcados / totalCriterios) * 100) : 0;

  const zonaEstados = useMemo(() => {
    const out: Record<string, EstadoHallazgo | null> = {};
    zonas.forEach((zona) => {
      out[zona.id] = peorEstado(hallazgos.filter((h) => h.zona_id === zona.id).map((h) => h.estado));
    });
    return out;
  }, [hallazgos, zonas]);

  const puntoEstados = useMemo(() => {
    const out: Record<string, EstadoHallazgo | null> = {};
    puntos.forEach((punto) => {
      out[punto.id] = peorEstado(hallazgos.filter((h) => h.punto_id === punto.id).map((h) => h.estado));
    });
    return out;
  }, [hallazgos, puntos]);

  const pins: PinPunto[] = useMemo(
    () =>
      hallazgos
        .filter((h) => h.punto_x != null && h.punto_y != null && !h.punto_id)
        .map((h): PinPunto | null => {
          if (h.punto_x == null || h.punto_y == null) return null;
          return { x: h.punto_x, y: h.punto_y, estado: h.estado, label: `${h.zona_nombre} · ${h.criterio_nombre}` };
        })
        .filter((pin): pin is PinPunto => pin !== null),
    [hallazgos]
  );

  const seleccionarGrupo = (grupo: GrupoControl) => {
    setGrupoSeleccionado(grupo.key);
    setIndiceAbierto(false);
    setResumenAbierto(false);
  };

  const seleccionarZona = (zona: RecorridoZona) => {
    const candidato = grupos.find((g) => g.zona.id === zona.id && (!g.punto || !grupoCompleto(g))) ??
      grupos.find((g) => g.zona.id === zona.id);
    if (candidato) seleccionarGrupo(candidato);
  };

  const seleccionarPunto = (punto: RecorridoPunto) => {
    const zona = zonas.find((z) => z.id === punto.zona_id);
    if (!zona) return;
    seleccionarGrupo({ key: grupoKey(zona.id, punto.id), zona, punto });
  };

  const siguientePendiente = () => {
    if (!grupos.length) return;
    const actualIndex = grupoActivoKey ? grupos.findIndex((g) => g.key === grupoActivoKey) : -1;
    const orden = [...grupos.slice(actualIndex + 1), ...grupos.slice(0, Math.max(0, actualIndex + 1))];
    const pendiente = orden.find((g) => !grupoCompleto(g));
    if (pendiente) {
      seleccionarGrupo(pendiente);
    } else {
      setResumenAbierto(true);
    }
  };

  const estadoSeleccionado = grupoActivo ? estadoGrupo(grupoActivo) : null;

  const criterioKey = (grupo: GrupoControl, criterioId: string) => `${grupo.key}::${criterioId}`;

  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-card px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onSalir}>
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{sucursalNombre || recorrido.titulo || "Recorrido"}</p>
            <p className="truncate text-xs text-muted-foreground">{fechaTexto}</p>
          </div>
          <Badge variant={readOnly ? "secondary" : "outline"}>{readOnly ? "Cerrado" : "Borrador"}</Badge>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{gruposCompletos} de {grupos.length} góndolas</span>
            <span className="font-medium text-foreground">{progreso}%</span>
          </div>
          <Progress value={progreso} className="h-1.5" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        <div className="mx-auto max-w-3xl space-y-3">
          <section className="space-y-2 rounded-md border bg-card p-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Tocá una góndola</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => setIndiceAbierto(true)}>
                <ClipboardList className="mr-1 h-4 w-4" />
                Índice
              </Button>
            </div>
            {plano ? (
              <div className="overflow-hidden rounded-md border bg-muted/20">
                <PlanoCanvas
                  plano={plano}
                  zonas={zonas}
                  zonaSeleccionadaId={grupoActivo?.zona.id}
                  zonaEstados={zonaEstados}
                  puntos={puntos}
                  puntoSeleccionadoId={grupoActivo?.punto?.id}
                  puntoEstados={puntoEstados}
                  pins={pins}
                  onZonaClick={seleccionarZona}
                  onPuntoClick={seleccionarPunto}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Esta sucursal no tiene plano cargado.
              </div>
            )}
          </section>

          {grupoActivo ? (
            <section className="space-y-3 rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Controlando</p>
                  <h2 className="text-lg font-semibold leading-snug">{nombreGrupo(grupoActivo)}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {estadoSeleccionado && (
                    <Badge variant="outline" className={ESTADO_SOFT_CLASSES[estadoSeleccionado]}>
                      {ESTADO_HALLAZGO_LABEL[estadoSeleccionado]}
                    </Badge>
                  )}
                  <HistorialRecorridoV2
                    puntoId={grupoActivo.punto?.id ?? null}
                    zonaId={grupoActivo.punto ? null : grupoActivo.zona.id}
                    titulo={nombreGrupo(grupoActivo)}
                  />
                </div>
              </div>

              {!readOnly && criteriosActivos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11" onClick={() => onGrupo(grupoActivo.zona, grupoActivo.punto, "cumple")}>
                    Todo cumple
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => onGrupo(grupoActivo.zona, grupoActivo.punto, "no_cumple")}>
                    Todo no cumple
                  </Button>
                </div>
              )}

              {criteriosActivos.length === 0 ? (
                <p className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
                  No hay criterios configurados para este espacio.
                </p>
              ) : (
                <div className="space-y-3">
                  {criteriosActivos.map((criterio) => {
                    const hallazgo = hallazgoDe(grupoActivo, criterio.id);
                    const estado = hallazgo?.estado ?? null;
                    const obsVisible = hallazgo
                      ? obsAbiertas[hallazgo.id] || obsCriteriosAbiertas[criterioKey(grupoActivo, criterio.id)] || Boolean(hallazgo.observaciones)
                      : false;
                    const fotosVisible = hallazgo ? fotosAbiertas[hallazgo.id] : false;
                    return (
                      <div key={criterio.id} className="space-y-2 rounded-md border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium leading-snug">{criterio.nombre}</p>
                            {criterio.descripcion && (
                              <p className="text-xs text-muted-foreground">{criterio.descripcion}</p>
                            )}
                          </div>
                          {estado && (
                            <Badge variant="outline" className={ESTADO_SOFT_CLASSES[estado]}>
                              {ESTADO_HALLAZGO_LABEL[estado]}
                            </Badge>
                          )}
                        </div>

                        {readOnly ? (
                          <Badge variant="outline" className={estado ? ESTADO_SOFT_CLASSES[estado] : "text-muted-foreground"}>
                            {estado ? ESTADO_HALLAZGO_LABEL[estado] : "Sin evaluar"}
                          </Badge>
                        ) : (
                          <div className="space-y-2">
                            {ESTADOS.map((est) => (
                              <Button
                                key={est}
                                type="button"
                                variant="outline"
                                className={cn("h-12 w-full justify-start text-base", estado === est && ESTADO_BUTTON_CLASSES[est])}
                                onClick={() => {
                                  void onEstado(grupoActivo.zona, grupoActivo.punto, criterio, est);
                                  if (est === "parcial" || est === "no_cumple") {
                                    setObsCriteriosAbiertas((prev) => ({ ...prev, [criterioKey(grupoActivo, criterio.id)]: true }));
                                  }
                                }}
                              >
                                {estado === est && <CheckCircle2 className="mr-2 h-5 w-5" />}
                                {ESTADO_HALLAZGO_LABEL[est]}
                              </Button>
                            ))}
                          </div>
                        )}

                        {hallazgo && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant={hallazgo.observaciones ? "secondary" : "outline"}
                                className="h-11"
                                onClick={() => setObsAbiertas((prev) => ({ ...prev, [hallazgo.id]: !prev[hallazgo.id] }))}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Observación
                              </Button>
                              <Button
                                type="button"
                                variant={fotosVisible ? "secondary" : "outline"}
                                className="h-11"
                                onClick={() => setFotosAbiertas((prev) => ({ ...prev, [hallazgo.id]: !prev[hallazgo.id] }))}
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                Foto
                              </Button>
                            </div>
                            {obsVisible && (
                              readOnly ? (
                                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                                  {hallazgo.observaciones || "Sin observaciones."}
                                </p>
                              ) : (
                                <Textarea
                                  rows={3}
                                  maxLength={2000}
                                  defaultValue={hallazgo.observaciones ?? ""}
                                  placeholder="Observaciones / comentarios"
                                  onBlur={(e) => onObservaciones(hallazgo, e.target.value)}
                                />
                              )
                            )}
                            {fotosVisible && <HallazgoFotos hallazgoId={hallazgo.id} readOnly={readOnly} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-md border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
              No hay góndolas cargadas para controlar.
            </section>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 border-t bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button variant="outline" className="h-11 flex-1" onClick={() => setIndiceAbierto(true)}>
            <ClipboardList className="mr-1 h-4 w-4" />
            Elegir
          </Button>
          <Button variant="secondary" className="h-11 flex-1" onClick={siguientePendiente}>
            Siguiente pendiente
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button className="h-11 flex-1" onClick={() => setResumenAbierto(true)}>
            Cierre
          </Button>
        </div>
      </footer>

      <Dialog open={indiceAbierto} onOpenChange={setIndiceAbierto}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto p-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Elegir góndola</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {grupos.map((grupo) => {
              const estado = estadoGrupo(grupo);
              const completo = grupoCompleto(grupo);
              return (
                <Button
                  key={grupo.key}
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-md border px-3 py-2 text-left",
                    grupo.key === grupoActivoKey && "bg-accent ring-1 ring-primary"
                  )}
                  onClick={() => seleccionarGrupo(grupo)}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs", estado ? ESTADO_SOFT_CLASSES[estado] : "text-muted-foreground")}>
                    {completo ? <CheckCircle2 className="h-4 w-4" /> : grupos.indexOf(grupo) + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{nombreGrupo(grupo)}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {criteriosPara(grupo.punto).filter((criterio) => hallazgoDe(grupo, criterio.id)?.estado).length} de {criteriosPara(grupo.punto).length} criterios
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resumenAbierto} onOpenChange={setResumenAbierto}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto p-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resumen del recorrido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="flex items-end justify-between gap-2">
                <span className="text-3xl font-bold">{progreso}%</span>
                <span className="text-xs text-muted-foreground">{criteriosMarcados} de {totalCriterios} criterios</span>
              </div>
              <Progress value={progreso} className="mt-3" />
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Badge variant="outline" className="justify-center border-success/30 bg-success/10 text-success">
                  {gruposCompletos} completas
                </Badge>
                <Badge variant="outline" className="justify-center text-muted-foreground">
                  {Math.max(0, grupos.length - gruposCompletos)} pendientes
                </Badge>
              </div>
            </div>

            {grupos.some((grupo) => !grupoCompleto(grupo)) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pendientes</p>
                {grupos.filter((grupo) => !grupoCompleto(grupo)).map((grupo) => (
                  <Button
                    key={grupo.key}
                    variant="outline"
                    className="h-auto w-full justify-between gap-2 px-3 py-2 text-left"
                    onClick={() => seleccionarGrupo(grupo)}
                  >
                    <span className="min-w-0 truncate">{nombreGrupo(grupo)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </Button>
                ))}
              </div>
            )}

            {readOnly ? (
              <Button variant="outline" className="h-12 w-full" onClick={onReabrir}>
                <History className="mr-2 h-4 w-4" />
                Reabrir recorrido
              </Button>
            ) : (
              <Button className="h-12 w-full" onClick={onCerrar} disabled={cerrando}>
                <Lock className="mr-2 h-4 w-4" />
                {cerrando ? "Cerrando…" : "Cerrar recorrido"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}