import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarPlus, Download, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { ESTADOS_POSTULACION, telefonoWhatsApp } from "@/lib/ats";
import { enlaceReserva } from "@/components/entrevistas/entrevistasTypes";
import WhatsappPlantillaDialog, { type DatosWhatsapp } from "./WhatsappPlantillaDialog";
import InvitarCandidatoDialog from "@/components/entrevistas/InvitarCandidatoDialog";

const db = supabase as any;

export default function FichaCandidato({ postulacion, onClose, onCambio }: { postulacion: any | null; onClose: () => void; onCambio: () => void }) {
  const [ev, setEv] = useState<any>(null);
  const [obs, setObs] = useState<any[]>([]);
  const [nota, setNota] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [evaluando, setEvaluando] = useState(false);
  const [invitar, setInvitar] = useState(false);
  const [waDialog, setWaDialog] = useState<DatosWhatsapp | null>(null);
  const p = postulacion;

  const cargar = useCallback(async () => {
    if (!p) return;
    const [{ data: e }, { data: o }] = await Promise.all([
      db.from("ats_evaluaciones").select("*").eq("postulacion_id", p.id).order("created_at", { ascending: false }).limit(1),
      db.from("ats_observaciones").select("*, empleados:autor_id(nombre, apellido)").eq("postulacion_id", p.id).order("created_at", { ascending: false }),
    ]);
    setEv(e?.[0] || null); setObs(o || []);
    if (p.cv_path) {
      const { data } = await supabase.storage.from("cvs-candidatos").createSignedUrl(p.cv_path, 3600);
      setCvUrl(data?.signedUrl || null);
    } else setCvUrl(null);
  }, [p]);
  useEffect(() => { setEv(null); setCvUrl(null); cargar(); }, [cargar]);

  const evaluar = async () => {
    setEvaluando(true);
    const { data, error } = await supabase.functions.invoke("ats-evaluar-cv", { body: { postulacion_id: p.id } });
    setEvaluando(false);
    if (error || data?.error) {
      let msg = data?.error || error?.message;
      try { msg = (await (error as any)?.context?.json())?.error || msg; } catch { /* */ }
      return toast.error(msg);
    }
    toast.success(`Evaluado: ${data.score}/100`); cargar(); onCambio();
  };
  const cambiarEstado = async (estado: string) => {
    await db.from("ats_postulaciones").update({ estado }).eq("id", p.id); onCambio();
  };
  const invitarWhatsApp = async () => {
    const numero = telefonoWhatsApp(p.candidatos?.telefono);
    if (!numero) {
      toast.error("El teléfono del postulante no es válido para WhatsApp. Generá el enlace y copialo.");
      return setInvitar(true);
    }
    try {
      const { data: cfgs } = await db.from("entrevistas_config").select("id").order("created_at").limit(1);
      const cfg = cfgs?.[0];
      const { data: token, error: eTok } = await db.rpc("entrevista_generar_token");
      if (eTok) throw eTok;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db.from("entrevistas_invitaciones").insert({ candidato_id: p.candidato_id, config_id: cfg?.id ?? null, token, creado_por: u?.user?.id ?? null });
      if (error) throw error;
      await db.from("candidatos").update({ estado: "pendiente_reserva" }).eq("id", p.candidato_id);
      setWaDialog({
        numero,
        link: enlaceReserva(token as string),
        nombre: p.candidatos?.nombre || "",
        apellido: p.candidatos?.apellido || "",
        puesto: p.ats_busquedas?.titulo || "el puesto",
      });
    } catch (e: any) {
      toast.error("No se pudo generar la invitación: " + (e.message || e));
    }
  };
  const abrirWhatsApp = async (texto: string) => {
    if (!waDialog) return;
    const ventana = window.open("", "_blank"); // se abre ya para que el navegador no la bloquee
    const url = `https://wa.me/${waDialog.numero}?text=${encodeURIComponent(texto)}`;
    if (ventana) ventana.location.href = url; else window.open(url, "_blank");
    await db.from("ats_observaciones").insert({ postulacion_id: p.id, nota: "Invitado a entrevista por WhatsApp" });
    await cambiarEstado("entrevista");
    setWaDialog(null);
    cargar();
  };
  const agregarNota = async () => {
    if (!nota.trim()) return;
    const { error } = await db.from("ats_observaciones").insert({ postulacion_id: p.id, nota: nota.trim() });
    if (error) return toast.error(error.message);
    setNota(""); cargar();
  };

  const c = p?.candidatos;
  const esPdf = (p?.cv_nombre || "").toLowerCase().endsWith(".pdf");
  const esImg = /\.(jpe?g|png|webp)$/i.test(p?.cv_nombre || "");
  const lista = (t: string, xs: string[]) => xs?.length ? (
    <div><h4 className="mb-1 font-semibold">{t}</h4><ul className="list-disc space-y-0.5 pl-5 text-sm">{xs.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  ) : null;

  return (
    <Sheet open={!!p} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-5xl">
        {p && (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {c?.nombre} {c?.apellido}
                {p.score != null && <Badge className="text-base">{Math.round(p.score)}/100</Badge>}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {p.ats_busquedas?.titulo || "Postulación general"} · {c?.telefono || "sin teléfono"} · {c?.email || "sin email"} {c?.localidad ? `· ${c.localidad}` : ""} {c?.dni ? `· DNI ${c.dni}` : ""}
              </p>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Select value={p.estado} onValueChange={cambiarEstado}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS_POSTULACION.map((e) => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" onClick={evaluar} disabled={evaluando || !p.cv_path}>
                {evaluando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} {ev ? "Re-evaluar con IA" : "Evaluar con IA"}
              </Button>
              {cvUrl && <Button variant="outline" asChild><a href={cvUrl} target="_blank" rel="noreferrer"><Download className="mr-1 h-4 w-4" /> Descargar CV</a></Button>}
              <Button onClick={invitarWhatsApp}><MessageCircle className="mr-1 h-4 w-4" /> Invitar a entrevista por WhatsApp</Button>
              <Button variant="ghost" size="sm" onClick={() => setInvitar(true)}><CalendarPlus className="mr-1 h-4 w-4" /> Copiar enlace</Button>
            </div>
            {p.mensaje && <p className="mt-3 rounded-md bg-muted p-3 text-sm">"{p.mensaje}"</p>}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                {!ev && <p className="text-sm text-muted-foreground">Todavía no tiene evaluación de la IA. {p.cv_nombre && !esPdf && !esImg ? "El CV está en Word: la IA solo lee PDF o fotos." : ""}</p>}
                {ev && (
                  <>
                    {ev.resumen && <div><h4 className="mb-1 font-semibold">Resumen</h4><p className="text-sm">{ev.resumen}</p></div>}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Puntaje por criterio</h4>
                      {(ev.criterios || []).map((k: any, i: number) => (
                        <div key={i} className="space-y-1 rounded-md border p-2">
                          <div className="flex justify-between text-sm"><span>{k.criterio} <span className="text-muted-foreground">(peso {k.peso})</span></span><b>{k.puntaje}</b></div>
                          <Progress value={k.puntaje} className="h-1.5" />
                          <p className="text-xs italic text-muted-foreground">{k.evidencia}</p>
                        </div>
                      ))}
                    </div>
                    {ev.experiencia?.length > 0 && (
                      <div><h4 className="mb-1 font-semibold">Experiencia identificada</h4>
                        <ul className="space-y-1 text-sm">{ev.experiencia.map((x: any, i: number) => <li key={i}><b>{x.puesto}</b>{x.empresa ? ` · ${x.empresa}` : ""}{x.periodo ? ` (${x.periodo})` : ""}{x.tareas ? <span className="block text-muted-foreground">{x.tareas}</span> : null}</li>)}</ul>
                      </div>
                    )}
                    {lista("Fortalezas", ev.fortalezas)}
                    {lista("Aspectos a verificar", ev.a_verificar)}
                    {lista("Preguntas sugeridas para la entrevista", ev.preguntas)}
                    <p className="text-xs text-muted-foreground">La IA asiste; la decisión es de RRHH.</p>
                  </>
                )}
                <div className="space-y-2">
                  <h4 className="font-semibold">Observaciones internas</h4>
                  <Textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Llamé, disponible desde diciembre" />
                  <Button size="sm" onClick={agregarNota}>Agregar</Button>
                  {obs.map((o) => <div key={o.id} className="rounded-md border p-2 text-sm"><p>{o.nota}</p><p className="text-xs text-muted-foreground">{o.empleados ? `${o.empleados.nombre} ${o.empleados.apellido} · ` : ""}{new Date(o.created_at).toLocaleString("es-AR")}</p></div>)}
                </div>
              </div>
              <div>
                {cvUrl && esPdf && <iframe src={cvUrl} title="CV" className="h-[80vh] w-full rounded-md border" />}
                {cvUrl && esImg && <img src={cvUrl} alt="CV" className="w-full rounded-md border" />}
                {!cvUrl && <p className="text-sm text-muted-foreground">Sin CV adjunto.</p>}
              </div>
            </div>
            <WhatsappPlantillaDialog
              datos={waDialog}
              onClose={() => setWaDialog(null)}
              onEnviar={abrirWhatsApp}
            />
            <InvitarCandidatoDialog
              candidato={invitar ? ({ ...c, id: p.candidato_id } as any) : null}
              puestoNombre={p.ats_busquedas?.titulo || ""}
              onClose={() => setInvitar(false)}
              onInvitado={() => { setInvitar(false); cambiarEstado("entrevista"); }}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
