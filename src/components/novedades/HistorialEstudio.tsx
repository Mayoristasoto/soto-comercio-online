import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Download, FolderOpen, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { leerPlanillaEstudio, type FilaEstudio } from "@/utils/novedadesEstudioXLSX";
import { EditorEstudioContable } from "./EditorEstudioContable";

interface Version {
  id: string; periodo: string; nombre: string; estado: string; origen: string;
  updated_at: string; enviada_at: string | null; archivo_path: string | null;
}

interface Props {
  /** Si se pasa, muestra solo las versiones de ese mes (YYYY-MM) y permite crear borradores */
  periodo?: string;
  desde: string;
  filasSistema: FilaEstudio[];
}

const T = "novedades_estudio_borradores";

export function HistorialEstudio({ periodo, desde, filasSistema }: Props) {
  const [items, setItems] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setLoading(true);
    let q = (supabase as any).from(T).select("id,periodo,nombre,estado,origen,updated_at,enviada_at,archivo_path").order("periodo", { ascending: false }).order("updated_at", { ascending: false });
    if (periodo) q = q.eq("periodo", periodo);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [periodo]);

  const user = async () => (await supabase.auth.getUser()).data.user?.id ?? null;

  const nuevo = async () => {
    const p = periodo!;
    const n = items.filter(i => i.periodo === p).length + 1;
    const { data, error } = await (supabase as any).from(T).insert({ periodo: p, nombre: `Borrador ${n}`, updated_by: await user() }).select("id").single();
    if (error) return toast.error(error.message);
    await cargar(); setAbierto(data.id);
  };

  const duplicar = async (v: Version) => {
    const { data: src } = await (supabase as any).from(T).select("*").eq("id", v.id).single();
    const nombre = prompt("Nombre del nuevo borrador", `${src.nombre} (copia)`);
    if (!nombre) return;
    const { id, created_at, updated_at, enviada_at, enviada_por, archivo_path, ...rest } = src;
    const { data, error } = await (supabase as any).from(T).insert({ ...rest, nombre, estado: "borrador", updated_by: await user() }).select("id").single();
    if (error) return toast.error(error.message);
    await cargar(); setAbierto(data.id);
  };

  const renombrar = async (v: Version) => {
    const nombre = prompt("Nuevo nombre", v.nombre);
    if (!nombre) return;
    await (supabase as any).from(T).update({ nombre }).eq("id", v.id);
    cargar();
  };

  const borrar = async (v: Version) => {
    if (!confirm(`¿Borrar "${v.nombre}"?${v.estado === "enviada" ? " Es una versión enviada al estudio." : ""}`)) return;
    if (v.archivo_path) await supabase.storage.from("estudio-contable").remove([v.archivo_path]);
    await (supabase as any).from(T).delete().eq("id", v.id);
    cargar();
  };

  const descargarOriginal = async (v: Version) => {
    const { data } = await supabase.storage.from("estudio-contable").createSignedUrl(v.archivo_path!, 60);
    if (data) window.open(data.signedUrl, "_blank");
  };

  const subir = async (files: FileList | null) => {
    if (!files?.length) return;
    setSubiendo(true);
    const uid = await user();
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        let parsed: Awaited<ReturnType<typeof leerPlanillaEstudio>> = { periodo: null, filas: [], anotaciones: [] };
        try { parsed = await leerPlanillaEstudio(file); } catch { toast.warning(`${file.name}: no se pudo leer la tabla, se guarda solo el archivo`); }
        let p = parsed.periodo || periodo || null;
        const resp = prompt(`Mes de "${file.name}" (AAAA-MM)`, p ?? "");
        if (!resp || !/^\d{4}-\d{2}$/.test(resp)) { toast.error(`${file.name}: mes inválido, se omitió`); continue; }
        p = resp;
        const id = crypto.randomUUID();
        const path = `${p}/${id}.xlsx`;
        const up = await supabase.storage.from("estudio-contable").upload(path, file, { upsert: true });
        if (up.error) throw up.error;
        const { error } = await (supabase as any).from(T).insert({
          id, periodo: p, nombre: file.name.replace(/\.xlsx?$/i, ""), origen: "importada", estado: "enviada",
          filas_manuales: parsed.filas, anotaciones: parsed.anotaciones, archivo_path: path,
          enviada_at: new Date(file.lastModified || Date.now()).toISOString(), enviada_por: uid, updated_by: uid,
        });
        if (error) throw error;
        ok++;
      } catch (e: any) {
        toast.error(`${file.name}: ${e.message || e}`);
      }
    }
    if (ok) toast.success(`${ok} planilla(s) guardadas`);
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
    cargar();
  };

  const filtrados = items.filter(i => !busca || `${i.periodo} ${i.nombre}`.toLowerCase().includes(busca.toLowerCase()));
  const badge = (e: string) => e === "enviada" ? <Badge>Enviada</Badge> : e === "cerrado" ? <Badge variant="secondary">Cerrado</Badge> : <Badge variant="outline">Borrador</Badge>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {periodo && <Button size="sm" onClick={nuevo}><Plus className="h-4 w-4 mr-1" /> Nuevo borrador</Button>}
        <Button size="sm" variant="outline" disabled={subiendo} onClick={() => fileRef.current?.click()}>
          {subiendo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Subir planilla enviada
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx" multiple hidden onChange={e => subir(e.target.files)} />
        {!periodo && <Input placeholder="Buscar mes o nombre…" value={busca} onChange={e => setBusca(e.target.value)} className="h-8 w-60" />}
      </div>

      {loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead><TableHead>Nombre</TableHead><TableHead>Estado</TableHead>
              <TableHead>Origen</TableHead><TableHead>Última edición / envío</TableHead><TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin versiones todavía</TableCell></TableRow>}
            {filtrados.map(v => (
              <TableRow key={v.id}>
                <TableCell>{v.periodo}</TableCell>
                <TableCell className="font-medium">{v.nombre}</TableCell>
                <TableCell>{badge(v.estado)}</TableCell>
                <TableCell>{v.origen === "importada" ? "Subida" : "Sistema"}</TableCell>
                <TableCell className="text-xs">{new Date(v.enviada_at || v.updated_at).toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right space-x-1 whitespace-nowrap">
                  <Button size="icon" variant="ghost" title="Abrir" onClick={() => setAbierto(v.id)}><FolderOpen className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Duplicar como borrador" onClick={() => duplicar(v)}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Renombrar" onClick={() => renombrar(v)}><Pencil className="h-4 w-4" /></Button>
                  {v.archivo_path && <Button size="icon" variant="ghost" title="Descargar original" onClick={() => descargarOriginal(v)}><Download className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="ghost" title="Borrar" onClick={() => borrar(v)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EditorEstudioContable
        open={!!abierto}
        onOpenChange={o => { if (!o) { setAbierto(null); cargar(); } }}
        desde={desde}
        filasSistema={filasSistema}
        borradorId={abierto}
      />
    </div>
  );
}
