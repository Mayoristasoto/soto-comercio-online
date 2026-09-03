import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Loader2, X } from "lucide-react";
import { BUCKET_EVIDENCIAS, type ChecklistFoto } from "./checklistTypes";

interface Props {
  controlId: string;
  itemId: string;
  fotos: ChecklistFoto[];
  readOnly?: boolean;
  onChange: () => void;
}

export function EvidenciaUploader({ controlId, itemId, fotos, readOnly = false, onChange }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (fotos.length === 0) {
        setUrls({});
        return;
      }
      const paths = fotos.map((f) => f.storage_path);
      const { data } = await supabase.storage.from(BUCKET_EVIDENCIAS).createSignedUrls(paths, 3600);
      if (cancelado || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d, i) => {
        if (d.signedUrl) map[paths[i]] = d.signedUrl;
      });
      setUrls(map);
    })();
    return () => {
      cancelado = true;
    };
  }, [fotos.map((f) => f.storage_path).join("|")]);

  const subir = async (files: FileList) => {
    setSubiendo(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: solo se permiten imágenes`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: máximo 10MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${controlId}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET_EVIDENCIAS).upload(path, file);
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase
          .from("checklist_item_fotos")
          .insert({ item_id: itemId, storage_path: path, uploaded_by: userData.user?.id ?? null });
        if (dbErr) throw dbErr;
      }
      onChange();
    } catch (e: any) {
      toast.error("Error al subir la foto: " + (e.message || e));
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (foto: ChecklistFoto) => {
    try {
      await supabase.storage.from(BUCKET_EVIDENCIAS).remove([foto.storage_path]);
      const { error } = await supabase.from("checklist_item_fotos").delete().eq("id", foto.id);
      if (error) throw error;
      onChange();
    } catch (e: any) {
      toast.error("Error al eliminar la foto: " + (e.message || e));
    }
  };

  return (
    <div className="space-y-2">
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              <a href={urls[f.storage_path]} target="_blank" rel="noreferrer">
                <img
                  src={urls[f.storage_path]}
                  alt="Evidencia del control"
                  loading="lazy"
                  className="h-20 w-20 rounded-md border object-cover"
                />
              </a>
              {!readOnly && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6"
                  onClick={() => eliminar(f)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <>
          <Input
            id={`evidencia-cam-${itemId}`}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              if (e.target.files?.length) subir(e.target.files);
              e.target.value = "";
            }}
          />
          <Input
            id={`evidencia-lib-${itemId}`}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              if (e.target.files?.length) subir(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={subiendo}
              onClick={() => document.getElementById(`evidencia-cam-${itemId}`)?.click()}
            >
              {subiendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              {subiendo ? "Subiendo..." : "Tomar foto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={subiendo}
              onClick={() => document.getElementById(`evidencia-lib-${itemId}`)?.click()}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Elegir de galería
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
