import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ImagePlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { BUCKET_EVIDENCIAS } from "@/components/recorrido/recorridoTypes";

interface Sucursal { id: string; nombre: string }

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
      toast.success("Enviado ✓");
      setFoto(null);
      setPreview(null);
      setComentario("");
    } catch {
      toast.error("No se pudo enviar el reporte");
    } finally {
      setEnviando(false);
      if (camRef.current) camRef.current.value = "";
      if (galRef.current) galRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      {!preview ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            {!sucursalId && (
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
            )}
            <Button type="button" className="w-full h-28 text-lg flex-col gap-2" onClick={() => camRef.current?.click()}>
              <Camera className="h-8 w-8" /> Tomar foto
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground"
              onClick={() => galRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" /> o elegir de la galería
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <img src={preview} alt="Foto a enviar" className="w-full rounded-lg" />
            <Textarea
              placeholder="Comentario (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
            />
            <Button type="button" className="w-full h-14 text-lg" disabled={enviando} onClick={enviar}>
              {enviando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
              Enviar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setFoto(null); setPreview(null); setComentario(""); }}
            >
              Descartar y sacar otra
            </Button>
          </CardContent>
        </Card>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => elegirFoto(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => elegirFoto(e.target.files)} />
    </div>
  );
};

export default ReporteRapido;
