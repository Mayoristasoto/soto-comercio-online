import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Grid3X3, ListOrdered, MousePointer2, Pencil, PlusSquare, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cargarGondolasV2, type BBox, type GondolaV2 } from "./FondoGondolasV2";
import { TIPO_ESPACIO_LABEL, TIPOS_ESPACIO, type TipoEspacio } from "./recorridoTypes";
import { fondoDe } from "./planosFondo";

const colorEstado = (status: string, type?: string) =>
  type === "heladera"
    ? "bg-sky-300/70 border-sky-600"
    : status === "occupied"
    ? "bg-red-300/70 border-red-600"
    : "bg-emerald-300/70 border-emerald-600";

interface Props {
  /** Sucursal cuyo mapa se está editando */
  sucursalId?: string | null;
  /** Se llama cuando cambió el mapa (para refrescar el plano del recorrido) */
  onChange?: () => void;
}

interface Draft { x: number; y: number; width: number; height: number }

/** Editor del mapa de espacios sobre la copia v2 del layout (gondolas_v2) */
export function EspaciosEditor({ sucursalId, onChange }: Props) {
  const contRef = useRef<HTMLDivElement>(null);
  const fondo = fondoDe(sucursalId);
  /** Lienzo: mismas unidades que el plano del editor de layout */
  const LIENZO: BBox = { x: 0, y: 0, width: fondo.width, height: fondo.height };
  const [espacios, setEspacios] = useState<GondolaV2[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<"dibujar" | "mover">("dibujar");
  const [tipoNuevo, setTipoNuevo] = useState<TipoEspacio>("gondola");
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const dragRef = useRef<null | { modo: "crear" | "mover" | "resize"; id?: string; x0: number; y0: number; base: Draft }>(null);

  // edición
  const [editando, setEditando] = useState<GondolaV2 | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState<TipoEspacio>("gondola");
  const [editStatus, setEditStatus] = useState("available");

  // bloque
  const [bloqueOpen, setBloqueOpen] = useState(false);
  const [bloqueCantidad, setBloqueCantidad] = useState(3);
  const [bloqueDir, setBloqueDir] = useState<"derecha" | "izquierda" | "abajo" | "arriba">("derecha");
  const [bloqueGap, setBloqueGap] = useState(2);

  // renumerar
  const [renumOpen, setRenumOpen] = useState(false);
  const [renumDesde, setRenumDesde] = useState(1);
  const [renumPorTipo, setRenumPorTipo] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const gs = await cargarGondolasV2(sucursalId);
    setEspacios(gs);
    setCargando(false);
  }, [sucursalId]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Se muestran TODOS los espacios del plano (góndolas, punteras, exhibidores, carteles) */
  const gondolas = espacios;
  const sel = useMemo(() => espacios.find((e) => e.id === selId) ?? null, [espacios, selId]);

  const aPct = (d: Draft) => ({
    left: `${((d.x - LIENZO.x) / LIENZO.width) * 100}%`,
    top: `${((d.y - LIENZO.y) / LIENZO.height) * 100}%`,
    width: `${(d.width / LIENZO.width) * 100}%`,
    height: `${(d.height / LIENZO.height) * 100}%`,
  });

  const aLienzo = (clientX: number, clientY: number) => {
    const r = contRef.current!.getBoundingClientRect();
    return {
      x: LIENZO.x + ((clientX - r.left) / r.width) * LIENZO.width,
      y: LIENZO.y + ((clientY - r.top) / r.height) * LIENZO.height,
    };
  };

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    if (modo !== "dibujar") return;
    const p = aLienzo(e.clientX, e.clientY);
    dragRef.current = { modo: "crear", x0: p.x, y0: p.y, base: { x: p.x, y: p.y, width: 0, height: 0 } };
    setDraft({ x: p.x, y: p.y, width: 0, height: 0 });
  };

  const onPointerDownEspacio = (e: React.PointerEvent, g: GondolaV2, resize = false) => {
    e.stopPropagation();
    setSelId(g.id);
    const p = aLienzo(e.clientX, e.clientY);
    dragRef.current = {
      modo: resize ? "resize" : "mover",
      id: g.id,
      x0: p.x,
      y0: p.y,
      base: { x: g.x, y: g.y, width: g.width, height: g.height },
    };
    setDraft({ x: g.x, y: g.y, width: g.width, height: g.height });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = aLienzo(e.clientX, e.clientY);
    if (d.modo === "crear") {
      setDraft({
        x: Math.min(d.x0, p.x),
        y: Math.min(d.y0, p.y),
        width: Math.abs(p.x - d.x0),
        height: Math.abs(p.y - d.y0),
      });
    } else if (d.modo === "mover") {
      setDraft({ ...d.base, x: d.base.x + (p.x - d.x0), y: d.base.y + (p.y - d.y0) });
    } else {
      setDraft({
        ...d.base,
        width: Math.max(6, d.base.width + (p.x - d.x0)),
        height: Math.max(6, d.base.height + (p.y - d.y0)),
      });
    }
  };

  const onPointerUp = async () => {
    const d = dragRef.current;
    const cur = draft;
    dragRef.current = null;
    setDraft(null);
    if (!d || !cur) return;

    const redondear = (n: number) => Math.round(n * 10) / 10;
    if (d.modo === "crear") {
      if (cur.width < 8 || cur.height < 8) return;
      await crear({
        x: redondear(cur.x),
        y: redondear(cur.y),
        width: redondear(cur.width),
        height: redondear(cur.height),
      });
    } else if (d.id) {
      const { error } = await supabase
        .from("gondolas_v2")
        .update({
          position_x: redondear(cur.x),
          position_y: redondear(cur.y),
          position_width: redondear(cur.width),
          position_height: redondear(cur.height),
        })
        .eq("id", d.id);
      if (error) return toast.error("No se pudo mover el espacio");
      setEspacios((prev) => prev.map((g) => (g.id === d.id ? { ...g, ...cur } : g)));
      onChange?.();
    }
  };

  const siguienteNumero = (tipo: TipoEspacio) => {
    const nums = espacios
      .filter((e) => e.type === tipo)
      .map((e) => parseInt(e.section, 10))
      .filter((n) => !Number.isNaN(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  };

  const nuevoId = () => `v2-${crypto.randomUUID().slice(0, 8)}`;

  const crear = async (d: Draft) => {
    const fila = {
      id: nuevoId(),
      type: tipoNuevo,
      section: String(siguienteNumero(tipoNuevo)),
      status: "available",
      category: "general",
      position_x: d.x,
      position_y: d.y,
      position_width: d.width,
      position_height: d.height,
      sucursal_id: sucursalId ?? null,
    };
    const { error } = await supabase.from("gondolas_v2").insert(fila);
    if (error) return toast.error("No se pudo crear el espacio");
    await cargar();
    setSelId(fila.id);
    onChange?.();
  };

  const duplicar = async () => {
    if (!sel) return;
    const fila = {
      id: nuevoId(),
      type: sel.type,
      section: String(siguienteNumero(sel.type as TipoEspacio)),
      status: sel.status,
      category: "general",
      position_x: sel.x + sel.width + 2,
      position_y: sel.y,
      position_width: sel.width,
      position_height: sel.height,
      rotation: sel.rotation ?? 0,
      sucursal_id: sucursalId ?? null,
    };
    const { error } = await supabase.from("gondolas_v2").insert(fila);
    if (error) return toast.error("No se pudo duplicar");
    await cargar();
    setSelId(fila.id);
    onChange?.();
  };

  const borrar = async (g: GondolaV2) => {
    if (!confirm(`¿Eliminar el espacio "${g.section}"?`)) return;
    const { error } = await supabase.from("gondolas_v2").delete().eq("id", g.id);
    if (error) return toast.error("No se pudo eliminar");
    setEspacios((prev) => prev.filter((x) => x.id !== g.id));
    if (selId === g.id) setSelId(null);
    onChange?.();
  };

  /** Guarda el ángulo de la góndola seleccionada (0-359 grados) */
  const aplicarRotacion = useCallback(async (grados: number, absoluto = false) => {
    if (!sel) return;
    const actual = Number(sel.rotation ?? 0);
    let valor = absoluto ? grados : actual + grados;
    valor = ((Math.round(valor) % 360) + 360) % 360;
    const { error } = await supabase.from("gondolas_v2").update({ rotation: valor }).eq("id", sel.id);
    if (error) return toast.error("No se pudo rotar la góndola");
    setEspacios((prev) => prev.map((g) => (g.id === sel.id ? { ...g, rotation: valor } : g)));
    onChange?.();
  }, [onChange, sel]);

  const moverConFlecha = useCallback(async (dx: number, dy: number) => {
    if (!sel) return;
    const x = Math.max(LIENZO.x, Math.min(LIENZO.width - sel.width, sel.x + dx));
    const y = Math.max(LIENZO.y, Math.min(LIENZO.height - sel.height, sel.y + dy));
    const { error } = await supabase
      .from("gondolas_v2")
      .update({ position_x: x, position_y: y })
      .eq("id", sel.id);
    if (error) return toast.error("No se pudo mover la góndola");
    setEspacios((prev) => prev.map((g) => (g.id === sel.id ? { ...g, x, y } : g)));
    onChange?.();
  }, [LIENZO.height, LIENZO.width, LIENZO.x, LIENZO.y, onChange, sel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!sel) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [role='dialog'], [contenteditable='true']")) return;
      const paso = event.shiftKey ? 5 : 1;
      const movimientos: Record<string, [number, number]> = {
        ArrowUp: [0, -paso],
        ArrowDown: [0, paso],
        ArrowLeft: [-paso, 0],
        ArrowRight: [paso, 0],
      };
      const movimiento = movimientos[event.key];
      if (!movimiento) return;
      event.preventDefault();
      void moverConFlecha(...movimiento);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moverConFlecha, sel]);

  const abrirEdicion = (g: GondolaV2) => {
    setEditando(g);
    setEditNombre(g.section);
    setEditTipo((TIPOS_ESPACIO as readonly string[]).includes(g.type) ? (g.type as TipoEspacio) : "gondola");
    setEditStatus(g.status);
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    const { error } = await supabase
      .from("gondolas_v2")
      .update({ section: editNombre.trim() || editando.section, type: editTipo, status: editStatus })
      .eq("id", editando.id);
    if (error) return toast.error("No se pudo guardar");
    setEditando(null);
    await cargar();
    onChange?.();
  };

  /** Repite el espacio seleccionado N veces en una dirección, con el mismo tamaño */
  const generarBloque = async () => {
    if (!sel) return toast.error("Elegí primero un espacio como modelo");
    const dx = bloqueDir === "derecha" ? sel.width + bloqueGap : bloqueDir === "izquierda" ? -(sel.width + bloqueGap) : 0;
    const dy = bloqueDir === "abajo" ? sel.height + bloqueGap : bloqueDir === "arriba" ? -(sel.height + bloqueGap) : 0;
    let n = siguienteNumero(sel.type as TipoEspacio);
    const filas = Array.from({ length: Math.max(1, bloqueCantidad) }, (_, i) => ({
      id: nuevoId(),
      type: sel.type,
      section: String(n++),
      status: "available",
      category: "general",
      position_x: sel.x + dx * (i + 1),
      position_y: sel.y + dy * (i + 1),
      position_width: sel.width,
      position_height: sel.height,
      rotation: sel.rotation ?? 0,
      sucursal_id: sucursalId ?? null,
    }));
    setGuardando(true);
    const { error } = await supabase.from("gondolas_v2").insert(filas);
    setGuardando(false);
    if (error) return toast.error("No se pudieron crear los espacios");
    setBloqueOpen(false);
    toast.success(`${filas.length} espacios creados`);
    await cargar();
    onChange?.();
  };

  /** Orden de recorrido: por bandas horizontales (arriba → abajo) y dentro de cada banda de izquierda a derecha */
  const ordenados = useMemo(() => {
    const banda = (g: GondolaV2) => Math.round((g.y + g.height / 2) / 30);
    return [...gondolas].sort((a, b) => banda(a) - banda(b) || a.x - b.x);
  }, [gondolas]);

  const previewRenum = useMemo(() => {
    const contadores: Record<string, number> = {};
    let global = renumDesde;
    return ordenados.map((g) => {
      let nuevo: string;
      if (renumPorTipo) {
        contadores[g.type] = (contadores[g.type] ?? renumDesde - 1) + 1;
        nuevo = String(contadores[g.type]);
      } else {
        nuevo = String(global++);
      }
      return { g, nuevo };
    });
  }, [ordenados, renumDesde, renumPorTipo]);

  const aplicarRenumeracion = async () => {
    setGuardando(true);
    const cambios = previewRenum.filter(({ g, nuevo }) => g.section !== nuevo);
    for (const { g, nuevo } of cambios) {
      await supabase.from("gondolas_v2").update({ section: nuevo }).eq("id", g.id);
    }
    setGuardando(false);
    setRenumOpen(false);
    toast.success(`${cambios.length} espacios renumerados`);
    await cargar();
    onChange?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={modo === "dibujar" ? "default" : "outline"} onClick={() => setModo("dibujar")}>
          <PlusSquare className="h-4 w-4 mr-1" /> Dibujar
        </Button>
        <Button size="sm" variant={modo === "mover" ? "default" : "outline"} onClick={() => setModo("mover")}>
          <MousePointer2 className="h-4 w-4 mr-1" /> Mover
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setBloqueOpen(true)} disabled={!sel}>
          <Grid3X3 className="h-4 w-4 mr-1" /> Generar en bloque
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setRenumOpen(true)}>
          <ListOrdered className="h-4 w-4 mr-1" /> Renumerar espacios
        </Button>
        <Badge variant="outline">{gondolas.length} espacios</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        En modo Dibujar arrastrá sobre el plano para crear un recuadro nuevo. En modo Mover arrastrálo para reubicarlo
        y usá la esquina inferior derecha para cambiar el tamaño. Tocá un recuadro para editar su número o borrarlo.
      </p>

      <div
        ref={contRef}
        className="relative w-full overflow-hidden rounded-md border bg-slate-50 select-none touch-none"
        style={{ aspectRatio: `${LIENZO.width} / ${LIENZO.height}`, cursor: modo === "dibujar" ? "crosshair" : "default" }}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {fondo.url && (
          <img
            src={fondo.url}
            alt="Plano del salón"
            className="absolute inset-0 w-full h-full object-contain opacity-40 pointer-events-none"
            draggable={false}
          />
        )}
        {gondolas.map((g) => {
          const arrastrando = dragRef.current?.id === g.id && draft;
          const box = arrastrando ? (draft as Draft) : { x: g.x, y: g.y, width: g.width, height: g.height };
          return (
            <div
              key={g.id}
              className={`absolute border-2 rounded-sm flex items-center justify-center text-[10px] font-semibold text-slate-700 ${colorEstado(g.status, g.type)} ${selId === g.id ? "ring-2 ring-primary" : ""}`}
              style={{ ...aPct(box), transform: g.rotation ? `rotate(${g.rotation}deg)` : undefined }}
              onPointerDown={(e) => onPointerDownEspacio(e, g)}
              onDoubleClick={(e) => { e.stopPropagation(); abrirEdicion(g); }}
              title={`${TIPO_ESPACIO_LABEL[(g.type as TipoEspacio)] ?? g.type} ${g.section}`}
            >
              {selId === g.id && (
                <span
                  className="absolute -right-1 -bottom-1 h-3 w-3 rounded-sm bg-primary cursor-se-resize"
                  onPointerDown={(e) => onPointerDownEspacio(e, g, true)}
                />
              )}
            </div>
          );
        })}
        {draft && dragRef.current?.modo === "crear" && (
          <div className="absolute border-2 border-dashed border-primary bg-primary/10 rounded-sm" style={aPct(draft)} />
        )}
        {cargando && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Cargando mapa…</div>}
      </div>

      {sel && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-2">
          <span className="text-sm font-medium">
            {TIPO_ESPACIO_LABEL[(sel.type as TipoEspacio)] ?? sel.type} {sel.section}
          </span>
          <div className="grid grid-cols-3 grid-rows-2 gap-1" aria-label="Mover góndola">
            <Button className="col-start-2" size="icon" variant="outline" onClick={() => moverConFlecha(0, -1)} title="Mover arriba">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button className="col-start-1 row-start-2" size="icon" variant="outline" onClick={() => moverConFlecha(-1, 0)} title="Mover a la izquierda">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button className="col-start-2 row-start-2" size="icon" variant="outline" onClick={() => moverConFlecha(0, 1)} title="Mover abajo">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button className="col-start-3 row-start-2" size="icon" variant="outline" onClick={() => moverConFlecha(1, 0)} title="Mover a la derecha">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1" aria-label="Rotar góndola">
            <Button size="icon" variant="outline" onClick={() => aplicarRotacion(-15)} title="Rotar 15° a la izquierda">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              className="h-9 w-20"
              value={Math.round(Number(sel.rotation ?? 0))}
              onChange={(e) => aplicarRotacion(Number(e.target.value) || 0, true)}
              title="Ángulo en grados"
            />
            <span className="text-xs text-muted-foreground">°</span>
            <Button size="icon" variant="outline" onClick={() => aplicarRotacion(15)} title="Rotar 15° a la derecha">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => aplicarRotacion(0, true)} title="Volver a 0°">0°</Button>
            <Button size="sm" variant="ghost" onClick={() => aplicarRotacion(90, true)} title="Poner a 90°">90°</Button>
          </div>
          <Button size="sm" variant="outline" onClick={() => abrirEdicion(sel)}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
          <Button size="sm" variant="outline" onClick={duplicar}><Copy className="h-4 w-4 mr-1" /> Duplicar</Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => borrar(sel)}>
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
          </Button>
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar espacio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Número / nombre</Label>
              <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Estado comercial</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Libre (verde)</SelectItem>
                  <SelectItem value="occupied">Ocupado (rojo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={guardarEdicion}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bloqueOpen} onOpenChange={setBloqueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generar espacios en bloque</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se repite {sel ? `${TIPO_ESPACIO_LABEL[(sel.type as TipoEspacio)] ?? sel.type} ${sel.section}` : "el espacio elegido"} con el mismo tamaño y separación.
            </p>
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input type="number" min={1} value={bloqueCantidad} onChange={(e) => setBloqueCantidad(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Select value={bloqueDir} onValueChange={(v) => setBloqueDir(v as typeof bloqueDir)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="derecha">Hacia la derecha</SelectItem>
                  <SelectItem value="izquierda">Hacia la izquierda</SelectItem>
                  <SelectItem value="abajo">Hacia abajo</SelectItem>
                  <SelectItem value="arriba">Hacia arriba</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Separación</Label>
              <Input type="number" min={0} value={bloqueGap} onChange={(e) => setBloqueGap(Number(e.target.value))} />
            </div>
            <Button className="w-full" onClick={generarBloque} disabled={guardando}>Crear</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renumOpen} onOpenChange={setRenumOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Renumerar espacios</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se numera de arriba hacia abajo y de izquierda a derecha. Revisá la vista previa antes de confirmar.
            </p>
            <div className="flex gap-2">
              <div className="space-y-1 flex-1">
                <Label>Empezar en</Label>
                <Input type="number" min={0} value={renumDesde} onChange={(e) => setRenumDesde(Number(e.target.value))} />
              </div>
              <div className="space-y-1 flex-1">
                <Label>Numeración</Label>
                <Select value={renumPorTipo ? "tipo" : "todo"} onValueChange={(v) => setRenumPorTipo(v === "tipo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tipo">Por tipo (góndolas 1..n)</SelectItem>
                    <SelectItem value="todo">Toda junta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="max-h-64 overflow-auto rounded-md border divide-y text-sm">
              {previewRenum.map(({ g, nuevo }) => (
                <div key={g.id} className="flex items-center justify-between px-2 py-1">
                  <span className="text-muted-foreground">
                    {TIPO_ESPACIO_LABEL[(g.type as TipoEspacio)] ?? g.type} · {g.section}
                  </span>
                  <span className={g.section === nuevo ? "text-muted-foreground" : "font-semibold"}>→ {nuevo}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={aplicarRenumeracion} disabled={guardando}>
              {guardando ? "Renumerando…" : "Confirmar renumeración"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
