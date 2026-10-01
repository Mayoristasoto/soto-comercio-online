import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, EyeOff, Eye, Lock, LockOpen, Plus, RotateCcw, Trash2, Loader2, Send } from "lucide-react";
import {
  COLUMNAS_ESTUDIO, anotacionesDeFilas, exportarEstudioDesdeFilas,
  type ColEstudio, type FilaEstudio,
} from "@/utils/novedadesEstudioXLSX";

type Overrides = Record<string, Partial<Record<ColEstudio, string>>>;

// Colores idénticos a los del Excel exportado (réplica del documento)
const XL = { verde: "#C6E0B4", rojo: "#FF7C80", gris: "#D9D9D9", amarillo: "#FFF2CC" };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  desde: string;
  filasSistema: FilaEstudio[];
  borradorId: string | null;
}

export function EditorEstudioContable({ open, onOpenChange, desde: desdeProp, filasSistema: filasSistemaProp, borradorId }: Props) {
  const [periodo, setPeriodo] = useState(desdeProp.slice(0, 7));
  const desde = periodo + "-01";
  const [nombre, setNombre] = useState("");
  const [origen, setOrigen] = useState<"sistema" | "importada">("sistema");
  const [archivoPath, setArchivoPath] = useState<string | null>(null);
  const filasSistema = origen === "importada" ? [] : filasSistemaProp;
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<"borrador" | "cerrado" | "enviada">("borrador");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [manuales, setManuales] = useState<FilaEstudio[]>([]);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [info, setInfo] = useState<string>("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const listo = useRef(false);
  const [modo, setModo] = useState<"excel" | "grilla">("excel");
  const refFecha = new Date(desde + "T00:00:00");
  const titulo = `Novedades SOTO ${refFecha.toLocaleDateString("es-AR", { month: "long" }).toLocaleUpperCase("es-AR")} ${refFecha.getFullYear()}`;

  useEffect(() => {
    if (!open || !borradorId) return;
    listo.current = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any).from("novedades_estudio_borradores").select("*").eq("id", borradorId).maybeSingle();
      setPeriodo(data?.periodo ?? desdeProp.slice(0, 7));
      setNombre(data?.nombre ?? "");
      setOrigen(data?.origen ?? "sistema");
      setArchivoPath(data?.archivo_path ?? null);
      setEstado(data?.estado ?? "borrador");
      setOverrides(data?.overrides ?? {});
      setManuales(data?.filas_manuales ?? []);
      setOcultos(data?.ocultos ?? []);
      setExtras(data?.anotaciones ?? []);
      setInfo(data ? `Última edición ${new Date(data.updated_at).toLocaleString("es-AR")}` : "");
      setLoading(false);
      setTimeout(() => { listo.current = true; }, 0);
    })();
  }, [open, borradorId, desdeProp]);

  const guardar = async (extra: Record<string, any> = {}) => {
    if (!borradorId) return;
    setSaving("saving");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("novedades_estudio_borradores").update({
      overrides, filas_manuales: manuales, ocultos, anotaciones: extras,
      updated_by: user?.id ?? null, ...extra,
    }).eq("id", borradorId);
    if (error) { toast.error("No se pudo guardar: " + error.message); setSaving("idle"); return; }
    setSaving("saved");
    setInfo(`Última edición ${new Date().toLocaleString("es-AR")}`);
  };

  useEffect(() => {
    if (!listo.current) return;
    const t = setTimeout(() => guardar(), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, manuales, ocultos, extras]);

  const cerrado = estado !== "borrador";

  const filas = useMemo(() => {
    const base = filasSistema.map(f => {
      const o = overrides[f.id] || {};
      return { ...f, ...o } as FilaEstudio;
    });
    return [...base, ...manuales.map(m => ({ ...m, manual: origen !== "importada" }))];
  }, [filasSistema, overrides, manuales]);

  const visibles = filas.filter(f => !ocultos.includes(f.id));
  const anotSistema = anotacionesDeFilas(visibles);
  const anotFinal = [...anotSistema.filter(a => !ocultos.includes("anot:" + a)), ...extras.filter(Boolean)];

  const setCelda = (f: FilaEstudio, col: ColEstudio, val: string) => {
    if (f.manual || origen === "importada") {
      setManuales(ms => ms.map(m => m.id === f.id ? { ...m, [col]: val } : m));
      return;
    }
    const sist = filasSistema.find(s => s.id === f.id);
    setOverrides(o => {
      const actual = { ...(o[f.id] || {}) };
      if (String(sist?.[col] ?? "") === val) delete actual[col]; else actual[col] = val;
      const n = { ...o, [f.id]: actual };
      if (!Object.keys(actual).length) delete n[f.id];
      return n;
    });
  };

  const revertir = (id: string, col: ColEstudio) => setOverrides(o => {
    const a = { ...(o[id] || {}) }; delete a[col];
    const n = { ...o, [id]: a }; if (!Object.keys(a).length) delete n[id]; return n;
  });

  const toggleOculto = (k: string) => setOcultos(o => o.includes(k) ? o.filter(x => x !== k) : [...o, k]);

  const agregarFila = () => {
    const vacia = Object.fromEntries(COLUMNAS_ESTUDIO.map(c => [c.key, ""])) as any;
    setManuales(m => [...m, { ...vacia, id: "manual-" + crypto.randomUUID() }]);
  };

  const recalcular = () => {
    // Quita overrides iguales al valor del sistema actual
    setOverrides(o => {
      const n: Overrides = {};
      for (const [id, cols] of Object.entries(o)) {
        const s = filasSistema.find(f => f.id === id);
        const keep = Object.fromEntries(Object.entries(cols).filter(([c, v]) => String((s as any)?.[c] ?? "") !== v));
        if (Object.keys(keep).length) n[id] = keep;
      }
      return n;
    });
    toast.success("Valores del sistema actualizados; se conservaron las ediciones manuales");
  };

  const cambiarEstado = async (e: "borrador" | "cerrado") => { setEstado(e); await guardar({ estado: e }); };

  const manualesSet = () => {
    const set = new Set<string>();
    for (const [id, cols] of Object.entries(overrides)) for (const c of Object.keys(cols)) set.add(`${id}:${c}`);
    return set;
  };

  const descargar = () => { exportarEstudioDesdeFilas(visibles, anotFinal, desde, manualesSet()); };

  const descargarOriginal = async () => {
    if (!archivoPath) return;
    const { data, error } = await supabase.storage.from("estudio-contable").createSignedUrl(archivoPath, 60);
    if (error || !data) return toast.error("No se pudo descargar");
    window.open(data.signedUrl, "_blank");
  };

  const marcarEnviada = async () => {
    if (!borradorId) return;
    if (!confirm("¿Marcar esta versión como enviada al estudio? Quedará en solo lectura.")) return;
    const blob = await exportarEstudioDesdeFilas(visibles, anotFinal, desde, manualesSet(), false);
    let path = archivoPath;
    if (!path) {
      path = `${periodo}/${borradorId}.xlsx`;
      const { error } = await supabase.storage.from("estudio-contable").upload(path, blob, { upsert: true });
      if (error) return toast.error("No se pudo guardar el archivo: " + error.message);
    }
    const { data: { user } } = await supabase.auth.getUser();
    setEstado("enviada");
    setArchivoPath(path);
    await guardar({ estado: "enviada", enviada_at: new Date().toISOString(), enviada_por: user?.id ?? null, archivo_path: path });
    toast.success("Versión marcada como enviada y archivada");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {nombre || "Planilla Estudio Contable"} — {periodo}
            <Badge variant={cerrado ? "secondary" : "outline"}>{estado === "enviada" ? "Enviada" : estado === "cerrado" ? "Cerrado" : "Borrador"}</Badge>
            {origen === "importada" && <Badge variant="outline">Subida</Badge>}
            <span className="text-xs font-normal text-muted-foreground">
              {saving === "saving" ? "Guardando…" : saving === "saved" ? "Guardado" : ""} {info}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-md border p-0.5">
            <Button size="sm" variant={modo === "excel" ? "default" : "ghost"} className="h-7" onClick={() => setModo("excel")}>Vista Excel</Button>
            <Button size="sm" variant={modo === "grilla" ? "default" : "ghost"} className="h-7" onClick={() => setModo("grilla")}>Vista grilla</Button>
          </div>
          <Button size="sm" onClick={descargar}><Download className="h-4 w-4 mr-1" /> Descargar Excel</Button>
          {archivoPath && <Button size="sm" variant="outline" onClick={descargarOriginal}><Download className="h-4 w-4 mr-1" /> Archivo original</Button>}
          {!cerrado && <Button size="sm" variant="outline" onClick={agregarFila}><Plus className="h-4 w-4 mr-1" /> Agregar fila</Button>}
          {!cerrado && origen === "sistema" && <Button size="sm" variant="outline" onClick={recalcular}><RotateCcw className="h-4 w-4 mr-1" /> Recalcular desde el sistema</Button>}
          {estado === "cerrado" && <Button size="sm" variant="outline" onClick={() => cambiarEstado("borrador")}><LockOpen className="h-4 w-4 mr-1" /> Reabrir</Button>}
          {estado === "borrador" && <Button size="sm" variant="outline" onClick={() => cambiarEstado("cerrado")}><Lock className="h-4 w-4 mr-1" /> Cerrar</Button>}
          {estado !== "enviada" && <Button size="sm" variant="secondary" onClick={marcarEnviada}><Send className="h-4 w-4 mr-1" /> Marcar como enviada</Button>}
          <span className="text-xs text-muted-foreground self-center">Las celdas resaltadas fueron editadas a mano.</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : modo === "excel" ? (
          <div className="overflow-auto flex-1 border rounded-md bg-background p-2">
            <table className="text-xs border-collapse" style={{ fontFamily: "Arial, sans-serif" }}>
              <colgroup>{[60, 240, 180, 64, 70, 90, 100, 90, 90, 150, 300].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
              <tbody>
                <tr><td colSpan={11} className="border border-border text-center font-bold text-base py-1.5">{titulo}</td></tr>
                <tr><td colSpan={11} className="h-4" /></tr>
                <tr>
                  {COLUMNAS_ESTUDIO.map(c => <td key={c.key} className="border border-border text-center font-bold p-1" style={{ background: XL.gris }}>{c.label}</td>)}
                </tr>
                {visibles.map(f => (
                  <tr key={f.id}>
                    {COLUMNAS_ESTUDIO.map(c => {
                      const v = f[c.key];
                      const has = v !== "" && v != null && v !== 0 && v !== "0";
                      const editado = f.manual || overrides[f.id]?.[c.key] !== undefined;
                      let bg: string | undefined;
                      if (["feriados", "gremio", "enf", "enfFam", "vacDias", "vacFechas"].includes(c.key) && has) bg = XL.verde;
                      if (c.key === "obs" && /ADELANTO/.test(String(v))) bg = XL.verde;
                      if (c.key === "inas" && has) bg = XL.rojo;
                      if ((c.key === "legajo" || c.key === "obraSocial") && !has) bg = XL.rojo;
                      if (editado) bg = XL.amarillo;
                      return (
                        <td key={c.key} className="border border-border p-0" style={{ background: bg }}>
                          <input
                            value={String(v ?? "")}
                            disabled={cerrado}
                            onChange={e => setCelda(f, c.key, e.target.value)}
                            className={`w-full bg-transparent px-1 py-1 outline-none focus:ring-2 focus:ring-primary ${c.num ? "text-center" : ""}`}
                            style={{ color: "#000" }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr><td colSpan={11} className="h-4" /></tr>
                <tr><td colSpan={11} className="border border-border text-center font-bold p-1" style={{ background: XL.gris }}>ANOTACIONES GENERALES</td></tr>
                {anotFinal.map((a, i) => (
                  <tr key={i}>
                    <td className="border border-border text-center">{i + 1}</td>
                    <td colSpan={10} className="border border-border px-1 py-1" style={{ background: /inasistencia/i.test(a) ? XL.rojo : XL.verde, color: "#000" }}>{a}</td>
                  </tr>
                ))}
                {!cerrado && (
                  <tr>
                    <td className="border border-border text-center">{anotFinal.length + 1}</td>
                    <td colSpan={10} className="border border-border p-0">
                      <input
                        placeholder="Escribí una anotación y presioná Enter…"
                        className="w-full bg-transparent px-1 py-1 outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={e => {
                          const t = e.currentTarget;
                          if (e.key === "Enter" && t.value.trim()) { setExtras(x => [...x, t.value.trim()]); t.value = ""; }
                        }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-[11px] text-muted-foreground mt-2">Hacé clic en cualquier celda para escribir. Para quitar anotaciones u ocultar empleados usá la "Vista grilla".</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 border rounded-md">
            <table className="text-xs w-full border-collapse">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  <th className="p-1 w-8"></th>
                  {COLUMNAS_ESTUDIO.map(c => <th key={c.key} className="p-1 text-left font-semibold whitespace-nowrap">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filas.map(f => {
                  const oculto = ocultos.includes(f.id);
                  return (
                    <tr key={f.id} className={`border-t ${oculto ? "opacity-40" : ""}`}>
                      <td className="p-1">
                        {f.manual
                          ? <Button size="icon" variant="ghost" className="h-6 w-6" disabled={cerrado} onClick={() => setManuales(m => m.filter(x => x.id !== f.id))}><Trash2 className="h-3 w-3" /></Button>
                          : <Button size="icon" variant="ghost" className="h-6 w-6" disabled={cerrado} title={oculto ? "Incluir" : "Ocultar de la exportación"} onClick={() => toggleOculto(f.id)}>{oculto ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>}
                      </td>
                      {COLUMNAS_ESTUDIO.map(c => {
                        const editado = f.manual || overrides[f.id]?.[c.key] !== undefined;
                        return (
                          <td key={c.key} className="p-0.5">
                            <div className="flex items-center gap-0.5">
                              <Input
                                value={String(f[c.key] ?? "")}
                                disabled={cerrado}
                                onChange={e => setCelda(f, c.key, e.target.value)}
                                className={`h-7 text-xs px-1 ${c.num ? "w-14 text-center" : c.key === "obs" ? "min-w-[220px]" : c.key === "nombre" ? "min-w-[180px]" : "min-w-[90px]"} ${editado ? "bg-accent/20 border-accent" : ""}`}
                              />
                              {editado && !f.manual && !cerrado && (
                                <button title="Volver al valor del sistema" onClick={() => revertir(f.id, c.key)} className="text-muted-foreground hover:text-foreground">
                                  <RotateCcw className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="p-3 border-t space-y-1">
              <div className="font-semibold text-sm">Anotaciones generales</div>
              {anotSistema.map(a => {
                const oc = ocultos.includes("anot:" + a);
                return (
                  <div key={a} className={`flex items-center gap-2 text-xs ${oc ? "opacity-40 line-through" : ""}`}>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={cerrado} onClick={() => toggleOculto("anot:" + a)}>{oc ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>
                    <span>{a}</span>
                    <Badge variant="outline" className="text-[10px]">sistema</Badge>
                  </div>
                );
              })}
              {extras.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={cerrado} onClick={() => setExtras(x => x.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                  <Input value={a} disabled={cerrado} className="h-7 text-xs bg-accent/20" onChange={e => setExtras(x => x.map((v, j) => j === i ? e.target.value : v))} />
                </div>
              ))}
              {!cerrado && <Button size="sm" variant="outline" onClick={() => setExtras(x => [...x, ""])}><Plus className="h-4 w-4 mr-1" /> Agregar anotación</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
