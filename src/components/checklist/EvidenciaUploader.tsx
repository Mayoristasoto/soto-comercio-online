import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, History, Image as ImageIcon, Loader2, X } from "lucide-react";
import { BUCKET_EVIDENCIAS, type ChecklistFoto } from "./checklistTypes";
import { FotoLightbox } from "./FotoLightbox";
import { HistorialFotosItem } from "./HistorialFotosItem";

interface Props {
  controlId: string;
  itemId: string;
  fotos: ChecklistFoto[];
  readOnly?: boolean;
  onChange: () => void;
  /** Para ver fotos anteriores del mismo ítem en la misma sucursal */
  sucursalId?: string | null;
  itemTexto?: string;
}

export function EvidenciaUploader({
  controlId,
  itemId,
  fotos,
  readOnly = false,
  onChange,
  sucursalId,
  itemTexto,
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (fotos.length === 0) return;
      const paths = fotos.map((f) => f.storage_path).filter((p) => !urls[p]);
      if (paths.length === 0) return;
      const { data } = await supabase.storage.from(BUCKET_EVIDENCIAS).createSignedUrls(paths, 3600);
      if (cancelado) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((d, i) => {
        if (d.signedUrl) map[paths[i]] = d.signedUrl;
      });
      // Fallback: si no se pudo firmar, se descarga el archivo y se genera un blob URL
      const faltantes = paths.filter((p) => !map[p]);
      for (const p of faltantes) {
        const { data: blob } = await supabase.storage.from(BUCKET_EVIDENCIAS).download(p);
        if (blob) map[p] = URL.createObjectURL(blob);
      }
      if (cancelado) return;
      setUrls((prev) => ({ ...prev, ...map }));
    })();
    return () => {
      cancelado = true;
    };
  }, [fotos.map((f) => f.storage_path).join("|")]);


  /** Reduce la imagen a máx 1600px y la convierte a JPEG para que la subida sea liviana desde el celular */
  const comprimir = async (file: File): Promise<Blob> => {
    try {
      const bitmap = await createImageBitmap(file);
      const max = 1600;
      const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
      return blob && blob.size > 0 ? blob : file;
    } catch {
      return file;
    }
  };

  const subir = async (files: FileList) => {
    setSubiendo(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      for (const file of Array.from(files)) {
        // Algunas cámaras móviles no informan el tipo MIME; en ese caso se acepta igual
        if (file.type && !file.type.startsWith("image/")) {
          toast.error(`${file.name || "Archivo"}: solo se permiten imágenes`);
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name || "Archivo"}: máximo 25MB`);
          continue;
        }
        const blob = await comprimir(file);
        const esJpeg = blob !== file;
        const contentType = esJpeg ? "image/jpeg" : file.type || "image/jpeg";
        const ext = esJpeg ? "jpg" : (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `${controlId}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET_EVIDENCIAS)
          .upload(path, blob, { contentType, upsert: false });
        if (upErr) throw upErr;
        // Vista previa inmediata para confirmar visualmente la foto cargada
        const previewUrl = URL.createObjectURL(blob);
        setUrls((prev) => ({ ...prev, [path]: previewUrl }));
        const { error: dbErr } = await supabase
          .from("checklist_item_fotos")
          .insert({ item_id: itemId, storage_path: path, uploaded_by: userData.user?.id ?? null });
        if (dbErr) throw dbErr;
      }
      onChange();
      toast.success("Foto cargada");
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
              <button
                type="button"
                className="block h-20 w-20 overflow-hidden rounded-md border bg-muted"
                onClick={() => setFotoAbierta(urls[f.storage_path] ?? null)}
              >
                {urls[f.storage_path] ? (
                  <img
                    src={urls[f.storage_path]}
                    alt="Evidencia del control"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </span>
                )}
              </button>

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

      {sucursalId && itemTexto && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-2 text-muted-foreground"
          onClick={() => setHistorialAbierto(true)}
        >
          <History className="mr-2 h-4 w-4" />
          Ver fotos anteriores
        </Button>
      )}

      <FotoLightbox url={fotoAbierta} onClose={() => setFotoAbierta(null)} />

      {sucursalId && itemTexto && historialAbierto && (
        <HistorialFotosItem
          open={historialAbierto}
          onOpenChange={setHistorialAbierto}
          itemTexto={itemTexto}
          sucursalId={sucursalId}
          controlIdActual={controlId}
          onVerFoto={(u) => setFotoAbierta(u)}
        />
      )}
    </div>
  );
}
