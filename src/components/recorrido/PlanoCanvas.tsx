import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET_PLANOS, ESTADO_HALLAZGO_DOT, type EstadoHallazgo, type RecorridoPlano, type RecorridoZona } from "./recorridoTypes";
import { ImageOff } from "lucide-react";

export interface PinPunto {
  x: number;
  y: number;
  estado?: EstadoHallazgo | null;
  label?: string;
}

interface Props {
  plano: RecorridoPlano;
  zonas: RecorridoZona[];
  zonaSeleccionadaId?: string | null;
  zonaEstados?: Record<string, EstadoHallazgo | null>;
  pins?: PinPunto[];
  onZonaClick?: (zona: RecorridoZona) => void;
  onCanvasClick?: (xPct: number, yPct: number, zona: RecorridoZona | null) => void;
}

/** Plano estático: imagen de referencia con zonas rectangulares clickeables. No depende del editor de góndolas. */
export function PlanoCanvas({ plano, zonas, zonaSeleccionadaId, zonaEstados = {}, pins = [], onZonaClick, onCanvasClick }: Props) {
  const contRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    const cargar = async () => {
      if (!plano.imagen_path) { setImgUrl(null); return; }
      const { data } = await supabase.storage.from(BUCKET_PLANOS).createSignedUrl(plano.imagen_path, 3600);
      if (data?.signedUrl) {
        // descargar como blob para mayor compatibilidad
        const { data: blob } = await supabase.storage.from(BUCKET_PLANOS).download(plano.imagen_path);
        if (blob) {
          revoke = URL.createObjectURL(blob);
          setImgUrl(revoke);
          return;
        }
        setImgUrl(data.signedUrl);
      } else {
        setError(true);
      }
    };
    cargar();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [plano.imagen_path]);

  const zonaEnPunto = (xPct: number, yPct: number) =>
    zonas.find((z) => xPct >= z.x && xPct <= z.x + z.width && yPct >= z.y && yPct <= z.y + z.height) ?? null;

  const handleClick = (e: React.MouseEvent) => {
    const rect = contRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const zona = zonaEnPunto(xPct, yPct);
    if (zona && onZonaClick) {
      onZonaClick(zona);
    } else if (onCanvasClick) {
      onCanvasClick(xPct, yPct, zona);
    }
  };

  const colorZona = (z: RecorridoZona) => {
    const est = zonaEstados[z.id];
    const sel = z.id === zonaSeleccionadaId;
    const base =
      est === "no_cumple"
        ? "bg-red-500/30 border-red-500"
        : est === "parcial"
          ? "bg-amber-400/30 border-amber-400"
          : est === "cumple"
            ? "bg-emerald-500/30 border-emerald-500"
            : "bg-sky-400/20 border-sky-500";
    return `${base} ${sel ? "ring-2 ring-primary border-primary" : ""}`;
  };

  return (
    <div className="relative w-full">
      {imgUrl ? (
        <div
          ref={contRef}
          className="relative w-full overflow-hidden rounded-md border bg-muted/30 select-none cursor-pointer"
          onClick={handleClick}
        >
          <img src={imgUrl} alt={plano.nombre} className="w-full h-auto block pointer-events-none" draggable={false} />
          {zonas.map((z) => (
            <div
              key={z.id}
              className={`absolute border-2 rounded-sm flex items-start justify-start transition-colors ${colorZona(z)}`}
              style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }}
            >
              <span className="text-[10px] font-semibold bg-background/85 rounded px-1 m-0.5 leading-tight">
                {z.nombre}
              </span>
            </div>
          ))}
          {pins.map((p, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 ${p.estado ? ESTADO_HALLAZGO_DOT[p.estado] : "bg-slate-500"}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={p.label}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 py-16 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <p className="text-sm">{error ? "No se pudo cargar la imagen del plano" : "Todavía no hay imagen del plano"}</p>
        </div>
      )}
    </div>
  );
}
