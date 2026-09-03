import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  ListChecks,
  Lock,
  Unlock,

  MessageSquare,
  SkipForward,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenciaUploader } from "./EvidenciaUploader";
import {
  ESTADO_CLASSES,
  ESTADO_LABEL,
  ESTADO_SOFT_CLASSES,
  resumirItems,
  type ChecklistEstadoItem,
  type ChecklistFoto,
  type ChecklistItem,
} from "./checklistTypes";

const SIN_SECCION = "General";
const ESTADOS: ChecklistEstadoItem[] = ["cumple", "parcial", "no_cumple"];

interface Props {
  titulo: string;
  sucursalNombre: string | null;
  fechaTexto: string;
  items: ChecklistItem[];
  fotos: ChecklistFoto[];
  readOnly?: boolean;
  obsGeneral: string;
  onObsGeneralChange: (texto: string) => void;
  onObsGeneralBlur: () => void;
  onEstado: (itemId: string, estado: ChecklistEstadoItem | null) => void;
  onObservaciones: (itemId: string, texto: string) => void;
  onFotosChange: () => void;
  onCerrar: () => void;
  onReabrir?: () => void;

  onSalir: () => void;
  sucursalId?: string | null;
}

type Pantalla = "item" | "seccion" | "cierre";

function seccionDe(item: ChecklistItem) {
  return item.seccion?.trim() || SIN_SECCION;
}

export function ChecklistModoGuiado({
  titulo,
  sucursalNombre,
  fechaTexto,
  items,
  fotos,
  readOnly = false,
  obsGeneral,
  onObsGeneralChange,
  onObsGeneralBlur,
  onEstado,
  onObservaciones,
  onFotosChange,
  onCerrar,
  onReabrir,

  onSalir,
  sucursalId,
}: Props) {
  const [indice, setIndice] = useState(0);
  const [pantalla, setPantalla] = useState<Pantalla>(items.length ? "item" : "cierre");
  const [mostrarObs, setMostrarObs] = useState(false);
  const [mostrarFotos, setMostrarFotos] = useState(false);
  const [indiceAbierto, setIndiceAbierto] = useState(false);

  const resumen = resumirItems(items);
  const item = items[indice];
  const seccionActual = item ? seccionDe(item) : "";

  const secciones = useMemo(() => {
    const mapa = new Map<string, ChecklistItem[]>();
    items.forEach((i) => {
      const k = seccionDe(i);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(i);
    });
    return Array.from(mapa.entries());
  }, [items]);

  const fotosItem = item ? fotos.filter((f) => f.item_id === item.id) : [];

  const irA = (nuevoIndice: number) => {
    setIndice(nuevoIndice);
    setMostrarObs(false);
    setMostrarFotos(false);
    setPantalla("item");
  };

  const avanzar = () => {
    const siguiente = indice + 1;
    if (siguiente >= items.length) {
      setPantalla("cierre");
      return;
    }
    const cambiaSeccion = seccionDe(items[siguiente]) !== seccionDe(items[indice]);
    setIndice(siguiente);
    setMostrarObs(false);
    setMostrarFotos(false);
    setPantalla(cambiaSeccion ? "seccion" : "item");
  };

  const retroceder = () => {
    if (pantalla !== "item") {
      setPantalla("item");
      return;
    }
    if (indice > 0) irA(indice - 1);
  };

  const marcar = (estado: ChecklistEstadoItem) => {
    if (!item || readOnly) return;
    const nuevo = item.estado === estado ? null : estado;
    onEstado(item.id, nuevo);
    if (nuevo && (nuevo === "parcial" || nuevo === "no_cumple")) {
      setMostrarObs(true);
      return;
    }
    if (nuevo) setTimeout(avanzar, 180);
  };

  const seccionAnterior = pantalla === "seccion" && indice > 0 ? seccionDe(items[indice - 1]) : null;
  const itemsSeccionAnterior = seccionAnterior
    ? items.filter((i) => seccionDe(i) === seccionAnterior)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onSalir}>
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{sucursalNombre ?? titulo}</p>
            <p className="truncate text-xs text-muted-foreground">
              {pantalla === "item" && seccionActual ? seccionActual : fechaTexto}
            </p>
          </div>
          <Sheet open={indiceAbierto} onOpenChange={setIndiceAbierto}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <ListChecks className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Secciones</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {secciones.map(([nombre, secItems]) => {
                  const r = resumirItems(secItems);
                  return (
                    <div key={nombre} className="space-y-1">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left"
                        onClick={() => {
                          const idx = items.findIndex((i) => i.id === secItems[0].id);
                          irA(idx);
                          setIndiceAbierto(false);
                        }}
                      >
                        <span className="text-sm font-medium">{nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.evaluados}/{r.total}
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-1 px-1">
                        {secItems.map((si) => {
                          const idx = items.findIndex((i) => i.id === si.id);
                          return (
                            <button
                              key={si.id}
                              type="button"
                              onClick={() => {
                                irA(idx);
                                setIndiceAbierto(false);
                              }}
                              className={cn(
                                "h-7 w-7 rounded-md border text-xs",
                                si.estado ? ESTADO_SOFT_CLASSES[si.estado] : "text-muted-foreground",
                                idx === indice && "ring-2 ring-primary"
                              )}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" className="w-full" onClick={() => { setPantalla("cierre"); setIndiceAbierto(false); }}>
                  Ir al cierre
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {pantalla === "item" ? `Ítem ${indice + 1} de ${items.length}` : `${resumen.evaluados} de ${resumen.total} evaluados`}
            </span>
            <span className="font-medium text-foreground">{resumen.porcentaje}%</span>
          </div>
          <Progress value={items.length ? (resumen.evaluados / items.length) * 100 : 0} className="h-1.5" />
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto px-3 py-4">
        {pantalla === "seccion" && (
          <div className="mx-auto max-w-md space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="text-lg font-semibold">Sección completada</h2>
            <p className="text-sm text-muted-foreground">{seccionAnterior}</p>
            <div className="flex justify-center">
              <ResumenSeccion items={itemsSeccionAnterior} />
            </div>
            <Button className="h-12 w-full" onClick={() => setPantalla("item")}>
              Continuar con {seccionActual}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {pantalla === "item" && item && (
          <div className="mx-auto max-w-md space-y-4">
            <Badge variant="outline" className="text-xs">
              {seccionActual}
            </Badge>
            <p className="text-xl font-semibold leading-snug">{item.texto}</p>

            {readOnly ? (
              <Badge
                variant="outline"
                className={cn("text-sm", item.estado ? ESTADO_SOFT_CLASSES[item.estado] : "")}
              >
                {item.estado ? ESTADO_LABEL[item.estado] : "Sin evaluar"}
              </Badge>
            ) : (
              <div className="space-y-2">
                {ESTADOS.map((e) => (
                  <Button
                    key={e}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-14 w-full justify-start text-base",
                      item.estado === e && ESTADO_CLASSES[e]
                    )}
                    onClick={() => marcar(e)}
                  >
                    {item.estado === e && <CheckCircle2 className="mr-2 h-5 w-5" />}
                    {ESTADO_LABEL[e]}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={item.observaciones ? "secondary" : "outline"}
                className="h-11 flex-1"
                onClick={() => setMostrarObs((v) => !v)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Observación
              </Button>
              <Button
                type="button"
                variant={fotosItem.length ? "secondary" : "outline"}
                className="h-11 flex-1"
                onClick={() => setMostrarFotos((v) => !v)}
              >
                <Camera className="mr-2 h-4 w-4" />
                Foto{fotosItem.length ? ` ${fotosItem.length}` : ""}
              </Button>
            </div>

            {(mostrarObs || (readOnly && item.observaciones)) &&
              (readOnly ? (
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  {item.observaciones || "Sin observaciones."}
                </p>
              ) : (
                <Textarea
                  autoFocus
                  rows={3}
                  maxLength={2000}
                  placeholder="Observaciones / comentarios"
                  value={item.observaciones ?? ""}
                  onChange={(e) => onObservaciones(item.id, e.target.value)}
                />
              ))}

            {(mostrarFotos || fotosItem.length > 0) && (
              <EvidenciaUploader
                controlId={item.control_id}
                itemId={item.id}
                fotos={fotosItem}
                readOnly={readOnly}
                onChange={onFotosChange}
                sucursalId={sucursalId}
                itemTexto={item.texto}
              />
            )}
          </div>
        )}

        {pantalla === "cierre" && (
          <div className="mx-auto max-w-md space-y-4 pb-4">
            <h2 className="text-lg font-semibold">Resumen del control</h2>
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold">{resumen.porcentaje}%</span>
                  <span className="text-xs text-muted-foreground">
                    {resumen.evaluados} de {resumen.total} ítems
                  </span>
                </div>
                <Progress value={resumen.porcentaje} />
                <ResumenSeccion items={items} />
              </CardContent>
            </Card>

            {resumen.sinEvaluar > 0 && (
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="text-sm font-medium">Ítems sin evaluar ({resumen.sinEvaluar})</p>
                  <div className="space-y-1">
                    {items
                      .map((it, idx) => ({ it, idx }))
                      .filter(({ it }) => !it.estado)
                      .map(({ it, idx }) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => irA(idx)}
                          className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm"
                        >
                          <span className="line-clamp-2">{it.texto}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Observaciones generales</p>
              {readOnly ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {obsGeneral || "Sin observaciones."}
                </p>
              ) : (
                <Textarea
                  rows={4}
                  maxLength={4000}
                  value={obsGeneral}
                  onChange={(e) => onObsGeneralChange(e.target.value)}
                  onBlur={onObsGeneralBlur}
                  placeholder="Conclusiones, acciones acordadas, plazos..."
                />
              )}
            </div>

            {!readOnly ? (
              <>
                <Button className="h-12 w-full" onClick={onCerrar}>
                  <Lock className="mr-2 h-4 w-4" />
                  Cerrar control
                </Button>
                {resumen.sinEvaluar > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Quedan {resumen.sinEvaluar} ítem(s) sin evaluar. Podés cerrar igual.
                  </p>
                )}
              </>
            ) : (
              onReabrir && (
                <>
                  <Button variant="outline" className="h-12 w-full" onClick={onReabrir}>
                    <Unlock className="mr-2 h-4 w-4" />
                    Reabrir control
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    El control está cerrado. Reabrilo para editar estados, observaciones o subir fotos.
                  </p>
                </>
              )
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      {pantalla === "item" && (
        <footer className="sticky bottom-0 border-t bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={retroceder}
              disabled={indice === 0}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            {!readOnly && (
              <Button variant="ghost" className="h-11" onClick={avanzar}>
                <SkipForward className="mr-1 h-4 w-4" />
                Saltar
              </Button>
            )}
            <Button className="h-11 flex-1" onClick={avanzar}>
              {indice + 1 >= items.length ? "Finalizar" : "Siguiente"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

function ResumenSeccion({ items }: { items: Pick<ChecklistItem, "estado">[] }) {
  const r = resumirItems(items);
  const chips = [
    { label: "Cumple", value: r.cumple, cls: ESTADO_SOFT_CLASSES.cumple },
    { label: "Parcial", value: r.parcial, cls: ESTADO_SOFT_CLASSES.parcial },
    { label: "No cumple", value: r.noCumple, cls: ESTADO_SOFT_CLASSES.no_cumple },
    { label: "Sin evaluar", value: r.sinEvaluar, cls: "bg-muted text-muted-foreground border-border" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span key={c.label} className={cn("rounded-full border px-3 py-1 text-xs font-medium", c.cls)}>
          {c.label}: {c.value}
        </span>
      ))}
    </div>
  );
}
