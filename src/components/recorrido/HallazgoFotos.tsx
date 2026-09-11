import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET_EVIDENCIAS } from "./recorridoTypes";
import { Button } from "@/components/ui/button";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Foto { id: string; storage_path: string }

interface Props {
  hallazgoId: string;
  readOnly?: boolean;
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

/** Fotos del hallazgo. Usa el mismo bucket que las evidencias del checklist de control. */
export function HallazgoFotos({ hallazgoId, readOnly }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [subiendo, setSubiendo] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    const { data } = await supabase
      .from("recorrido_hallazgo_fotos")
      .select("id, storage_path")
      .eq("hallazgo_id", hallazgoId)
      .order("created_at");
    const lista = (data as Foto[]) ?? [];
    setFotos(lista);
    const map: Record<string, string> = {};
    for (const f of lista) {
      const { data: blob } = await supabase.storage.from(BUCKET_EVIDENCIAS).download(f.storage_path);
      if (blob) map[f.id] = URL.createObjectURL(blob);
    }
    setUrls(map);
  };

  useEffect(() => {
    cargar();
    return () => { Object.values(urls).forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallazgoId]);

  const subir = async (files: FileList | null) => {
    if (!files?.length) return;
    setSubiendo(true);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name}: supera 25 MB`); continue; }
        const blob = await comprimir(file);
        const path = `recorridos/${hallazgoId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from(BUCKET_EVIDENCIAS).upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from("recorrido_hallazgo_fotos").insert({ hallazgo_id: hallazgoId, storage_path: path });
        if (dbErr) throw dbErr;
      }
      await cargar();
      toast.success("Foto guardada");
    } catch {
      toast.error("No se pudo subir la foto");
    } finally {
      setSubiendo(false);
      if (camRef.current) camRef.current.value = "";
      if (galRef.current) galRef.current.value = "";
    }
  };

  const borrar = async (f: Foto) => {
    await supabase.storage.from(BUCKET_EVIDENCIAS).remove([f.storage_path]);
    await supabase.from("recorrido_hallazgo_fotos").delete().eq("id", f.id);
    cargar();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {fotos.map((f) => (
          <div key={f.id} className="relative h-16 w-16 rounded border overflow-hidden bg-muted">
            {urls[f.id] ? (
              <img src={urls[f.id]} alt="evidencia" className="h-full w-full object-cover" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin m-auto mt-6 text-muted-foreground" />
            )}
            {!readOnly && (
              <button className="absolute top-0.5 right-0.5 rounded bg-background/80 p-0.5 text-destructive" onClick={() => borrar(f)}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={subiendo} onClick={() => camRef.current?.click()}>
            {subiendo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />} Tomar foto
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={subiendo} onClick={() => galRef.current?.click()}>
            <ImagePlus className="h-4 w-4 mr-1" /> Galería
          </Button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => subir(e.target.files)} />
          <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => subir(e.target.files)} />
        </div>
      )}
    </div>
  );
}
