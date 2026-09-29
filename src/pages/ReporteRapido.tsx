import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ImagePlus, Loader2, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { BUCKET_EVIDENCIAS } from "@/components/recorrido/recorridoTypes";

interface Sucursal { id: string; nombre: string }
interface Reporte {
  id: string;
  comentario: string | null;
  storage_path: string;
  created_at: string;
}

const comprimir = (file: File): Promise<Blob> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.8);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });

/** Versión simplificada del recorrido: foto + comentario opcional, para personal de apoyo. */
const ReporteRapido = () => {
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState("");
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      if (!uid) return;
      const [{ data: emp }, { data: suc }] = await Promise.all([
        supabase.from("empleados").select("id, sucursal_id").eq("user_id", uid).eq("activo", true).maybeSingle(),
        supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
      ]);
      if (emp) {
        setEmpleadoId(emp.id);
        if (emp.sucursal_id) setSucursalId(emp.sucursal_id);
      }
      setSucursales((suc as Sucursal[]) ?? []);
    })();
  }, []);

  const cargarReportes = async () => {
    if (!empleadoId) return;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("reportes_rapidos")
      .select("id, comentario, storage_path, created_at")
      .eq("empleado_id", empleadoId)
      .gte("created_at", hoy.toISOString())
      .order("created_at", { ascending: false });
    const lista = (data as Reporte[]) ?? [];
    setReportes(lista);
    const map: Record<string, string> = {};
    for (const r of lista) {
      const { data: blob } = await supabase.storage.from(BUCKET_EVIDENCIAS).download(r.storage_path);
      if (blob) map[r.id] = URL.createObjectURL(blob);
    }
    setUrls(map);
  };

  useEffect(() => {
    cargarReportes();
    return () => { Object.values(urls).forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  const elegirFoto = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast.error("La foto supera 25 MB"); return; }
    setFoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const enviar = async () => {
    if (!empleadoId) { toast.error("No se encontró tu ficha de empleado"); return; }
    if (!foto) { toast.error("Sacá o elegí una foto primero"); return; }
    if (!sucursalId) { toast.error("Elegí la sucursal"); return; }
    setEnviando(true);
    try {
      const blob = await comprimir(foto);
      const path = `reportes-rapidos/${empleadoId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET_EVIDENCIAS).upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("reportes_rapidos").insert({
        empleado_id: empleadoId,
        sucursal_id: sucursalId,
        comentario: comentario.trim() || null,
        storage_path: path,
      });
      if (dbErr) throw dbErr;
      toast.success("Reporte enviado");
      setFoto(null);
      setPreview(null);
      setComentario("");
      await cargarReportes();
    } catch {
      toast.error("No se pudo enviar el reporte");
    } finally {
      setEnviando(false);
      if (camRef.current) camRef.current.value = "";
      if (galRef.current) galRef.current.value = "";
    }
  };

  const borrar = async (r: Reporte) => {
    await supabase.storage.from(BUCKET_EVIDENCIAS).remove([r.storage_path]);
    await supabase.from("reportes_rapidos").delete().eq("id", r.id);
    cargarReportes();
  };

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Camera className="h-5 w-5" /> Reportar algo
      </h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Sucursal</label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger><SelectValue placeholder="Elegí la sucursal" /></SelectTrigger>
              <SelectContent>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preview ? (
            <div className="relative">
              <img src={preview} alt="Foto a enviar" className="w-full rounded-lg" />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => { setFoto(null); setPreview(null); }}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-20 flex-col gap-1" onClick={() => camRef.current?.click()}>
                <Camera className="h-6 w-6" /> Tomar foto
              </Button>
              <Button type="button" variant="outline" className="h-20 flex-col gap-1" onClick={() => galRef.current?.click()}>
                <ImagePlus className="h-6 w-6" /> Galería
              </Button>
            </div>
          )}
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => elegirFoto(e.target.files)} />
          <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => elegirFoto(e.target.files)} />

          <div className="space-y-1">
            <label className="text-sm font-medium">Comentario (opcional)</label>
            <Textarea
              placeholder="Ej: heladera 2 sin precios, faltante en góndola 3..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="button" className="w-full h-12 text-base" disabled={enviando || !foto} onClick={enviar}>
            {enviando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
            Enviar reporte
          </Button>
        </CardContent>
      </Card>

      {reportes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Mis reportes de hoy</h2>
          {reportes.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-14 w-14 rounded border overflow-hidden bg-muted shrink-0">
                  {urls[r.id] ? (
                    <img src={urls[r.id]} alt="reporte" className="h-full w-full object-cover" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin m-auto mt-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-sm truncate">{r.comentario || "Sin comentario"}</div>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => borrar(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReporteRapido;
