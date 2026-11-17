import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEsRRHH } from "@/hooks/useEsRRHH";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Briefcase, Copy, FileSpreadsheet, Loader2, Search, Upload } from "lucide-react";
import { ESTADOS_POSTULACION, estadoLabel, nivelPuntaje, ordenarRanking } from "@/lib/ats";
import Busquedas from "@/components/seleccion/Busquedas";
import FichaCandidato from "@/components/seleccion/FichaCandidato";
import PlantillasWhatsapp from "@/components/seleccion/PlantillasWhatsapp";

const db = supabase as any;
const COLOR: Record<string, string> = { alto: "bg-primary text-primary-foreground", medio: "bg-accent text-accent-foreground", bajo: "bg-muted text-foreground", sin: "bg-muted text-muted-foreground" };

export default function Seleccion() {
  const { esRRHH, loading } = useEsRRHH();
  const [posts, setPosts] = useState<any[]>([]);
  const [busquedas, setBusquedas] = useState<any[]>([]);
  const [fB, setFB] = useState("todas");
  const [fE, setFE] = useState("activos");
  const [fMin, setFMin] = useState(0);
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState<any>(null);
  const [carga, setCarga] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    const [{ data: p }, { data: b }] = await Promise.all([
      db.from("ats_postulaciones").select("*, candidatos(nombre, apellido, telefono, email, dni, localidad), ats_busquedas(titulo)").order("created_at", { ascending: false }).limit(1000),
      db.from("ats_busquedas").select("id, titulo, estado").order("created_at", { ascending: false }),
    ]);
    setPosts(p || []); setBusquedas(b || []);
    setAbierta((a: any) => (a ? (p || []).find((x: any) => x.id === a.id) || null : null));
  }, []);
  useEffect(() => { if (esRRHH) cargar(); }, [esRRHH, cargar]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ordenarRanking(posts.filter((p) =>
      (fB === "todas" || (fB === "general" ? !p.busqueda_id : p.busqueda_id === fB)) &&
      (fE === "todos" || (fE === "activos" ? !["descartado", "base_talentos"].includes(p.estado) : p.estado === fE)) &&
      (!fMin || (p.score ?? 0) >= fMin) &&
      (!t || `${p.candidatos?.nombre} ${p.candidatos?.apellido} ${p.candidatos?.localidad} ${p.candidatos?.dni}`.toLowerCase().includes(t))
    ));
  }, [posts, fB, fE, fMin, q]);

  const kpi = useMemo(() => ({
    total: posts.length,
    nuevas: posts.filter((p) => p.estado === "nuevo").length,
    sinEval: posts.filter((p) => p.score == null).length,
    entrevista: posts.filter((p) => p.estado === "entrevista").length,
  }), [posts]);

  const exportar = () => {
    const filas = filtradas.map((p, i) => ({
      Ranking: i + 1, Puntaje: p.score ?? "", Nombre: p.candidatos?.nombre, Apellido: p.candidatos?.apellido,
      Teléfono: p.candidatos?.telefono, Email: p.candidatos?.email, DNI: p.candidatos?.dni, Localidad: p.candidatos?.localidad,
      Búsqueda: p.ats_busquedas?.titulo || "General", Estado: estadoLabel(p.estado), Origen: p.origen,
      Fecha: new Date(p.created_at).toLocaleDateString("es-AR"),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Ranking");
    XLSX.writeFile(wb, `ranking-candidatos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const cargarManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const files = (f.getAll("cvs") as File[]).filter((x) => x.size);
    const busqueda_id = f.get("busqueda") === "none" ? null : String(f.get("busqueda"));
    if (!files.length) return toast.error("Elegí al menos un CV");
    setSubiendo(true);
    let ok = 0;
    for (const file of files) {
      try {
        const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        const { data: c, error } = await db.from("candidatos").insert({ nombre: base.slice(0, 80) || "Sin nombre", origen: "manual" }).select("id").single();
        if (error) throw error;
        const ext = file.name.split(".").pop()?.toLowerCase();
        const path = `${c.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("cvs-candidatos").upload(path, file);
        if (up.error) throw up.error;
        const { data: p, error: e2 } = await db.from("ats_postulaciones").insert({ candidato_id: c.id, busqueda_id, origen: "manual", cv_path: path, cv_nombre: file.name }).select("id").single();
        if (e2) throw e2;
        if (/^(pdf|jpe?g|png|webp)$/.test(ext || "")) {
          const { data: r } = await supabase.functions.invoke("ats-evaluar-cv", { body: { postulacion_id: p.id } });
          if (r?.score == null) toast.warning(`${file.name}: cargado, la IA no pudo evaluarlo`);
        }
        ok++;
      } catch (err) {
        toast.error(`${file.name}: ${(err as Error).message}`);
      }
    }
    setSubiendo(false); setCarga(false);
    toast.success(`${ok} CV cargados. La IA completa nombre y contacto desde el CV.`);
    cargar();
  };

  if (loading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (!esRRHH) return <div className="p-6"><h1 className="text-xl font-bold">Sección no disponible</h1><p className="text-muted-foreground">Uso exclusivo de Recursos Humanos.</p></div>;

  const linkGeneral = `${location.origin}/postular`;

  return (
    <div className="container mx-auto space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Briefcase className="h-6 w-6 text-primary" /> Selección de personal</h1>
          <p className="text-muted-foreground">Postulaciones, ranking con IA y seguimiento. La IA asiste: nadie se descarta automáticamente.</p>
        </div>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(linkGeneral); toast.success("Enlace copiado"); }}><Copy className="mr-1 h-4 w-4" /> Enlace "Trabajá con nosotros"</Button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Postulaciones", kpi.total], ["Nuevas", kpi.nuevas], ["Sin evaluar", kpi.sinEval], ["En entrevista", kpi.entrevista]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="ranking">
        <TabsList><TabsTrigger value="ranking">Ranking</TabsTrigger><TabsTrigger value="busquedas">Búsquedas y criterios</TabsTrigger><TabsTrigger value="plantillas">Plantillas de WhatsApp</TabsTrigger></TabsList>
        <TabsContent value="ranking" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="w-56 pl-8" placeholder="Nombre, DNI, localidad" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <Select value={fB} onValueChange={setFB}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Todas las búsquedas</SelectItem><SelectItem value="general">Postulación general</SelectItem>{busquedas.map((b) => <SelectItem key={b.id} value={b.id}>{b.titulo}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fE} onValueChange={setFE}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="activos">En proceso</SelectItem><SelectItem value="todos">Todos los estados</SelectItem>{ESTADOS_POSTULACION.map((e) => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(fMin)} onValueChange={(v) => setFMin(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{[0, 50, 65, 75, 85].map((n) => <SelectItem key={n} value={String(n)}>{n ? `Puntaje ≥ ${n}` : "Cualquier puntaje"}</SelectItem>)}</SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={exportar}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
              <Button onClick={() => setCarga(true)}><Upload className="mr-1 h-4 w-4" /> Cargar CVs</Button>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead className="w-20">Puntaje</TableHead><TableHead>Candidato</TableHead><TableHead>Búsqueda</TableHead><TableHead>Estado</TableHead><TableHead>Origen</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtradas.map((p, i) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setAbierta(p)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell><span className={`inline-flex min-w-10 justify-center rounded-md px-2 py-0.5 text-sm font-bold ${COLOR[nivelPuntaje(p.score)]}`}>{p.score != null ? Math.round(p.score) : "—"}</span></TableCell>
                    <TableCell><p className="font-medium">{p.candidatos?.nombre} {p.candidatos?.apellido}</p><p className="text-xs text-muted-foreground">{p.candidatos?.telefono} {p.candidatos?.localidad ? `· ${p.candidatos.localidad}` : ""}</p></TableCell>
                    <TableCell>{p.ats_busquedas?.titulo || <span className="text-muted-foreground">General</span>}</TableCell>
                    <TableCell><Badge variant="outline">{estadoLabel(p.estado)}</Badge></TableCell>
                    <TableCell className="text-sm">{p.origen === "web" ? "Web" : "Carga RRHH"}</TableCell>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("es-AR")}</TableCell>
                  </TableRow>
                ))}
                {!filtradas.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay postulaciones con estos filtros.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="busquedas" className="mt-4"><Busquedas onCambio={cargar} /></TabsContent>
        <TabsContent value="plantillas" className="mt-4"><PlantillasWhatsapp /></TabsContent>
      </Tabs>

      <Dialog open={carga} onOpenChange={setCarga}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cargar CVs recibidos</DialogTitle></DialogHeader>
          <form onSubmit={cargarManual} className="space-y-3">
            <div className="space-y-1"><Label>Búsqueda</Label>
              <select name="busqueda" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="none">Postulación general</option>
                {busquedas.filter((b) => b.estado !== "cerrada").map((b) => <option key={b.id} value={b.id}>{b.titulo}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>CVs (podés elegir varios · PDF o foto para que la IA los lea)</Label><Input name="cvs" type="file" multiple accept=".pdf,.doc,.docx,image/*" /></div>
            <Button type="submit" className="w-full" disabled={subiendo}>{subiendo ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Cargando y evaluando…</> : "Cargar y evaluar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <FichaCandidato postulacion={abierta} onClose={() => setAbierta(null)} onCambio={cargar} />
    </div>
  );
}
