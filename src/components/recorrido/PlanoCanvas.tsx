import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET_PLANOS, ESTADO_HALLAZGO_DOT, type EstadoHallazgo, type RecorridoPlano, type RecorridoPunto, type RecorridoZona } from "./recorridoTypes";
import { FondoGondolasV2, useFondoGondolasV2 } from "./FondoGondolasV2";
import { fondoDe } from "./planosFondo";
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
  puntos?: RecorridoPunto[];
  puntoSeleccionadoId?: string | null;
  puntoEstados?: Record<string, EstadoHallazgo | null>;
  pins?: PinPunto[];
  onZonaClick?: (zona: RecorridoZona) => void;
  onPuntoClick?: (punto: RecorridoPunto) => void;
  onCanvasClick?: (xPct: number, yPct: number, zona: RecorridoZona | null) => void;
}

/** Plano estático: imagen de referencia o layout de góndolas (copia v2) con zonas rectangulares clickeables. */
export function PlanoCanvas({
  plano,
  zonas,
  zonaSeleccionadaId,
  zonaEstados = {},
  puntos = [],
  puntoSeleccionadoId,
  puntoEstados = {},
  pins = [],
  onZonaClick,
  onPuntoClick,
  onCanvasClick,
}: Props) {
  const contRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const usaGondolas = !!plano.usa_gondolas;
  const { gondolas } = useFondoGondolasV2(usaGondolas, plano.sucursal_id);
  const fondo = fondoDe(plano.sucursal_id);
  const bbox = { x: 0, y: 0, width: fondo.width, height: fondo.height };

  useEffect(() => {
    let revoke: string | null = null;
    const cargar = async () => {
      if (usaGondolas || !plano.imagen_path) { setImgUrl(null); return; }
      const { data } = await supabase.storage.from(BUCKET_PLANOS).createSignedUrl(plano.imagen_path, 3600);
      if (data?.signedUrl) {
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
  }, [plano.imagen_path, usaGondolas]);

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
        ? "bg-destructive/55 border-destructive"
        : est === "parcial"
          ? "bg-warning/55 border-warning"
          : est === "cumple"
            ? "bg-success/55 border-success"
            : "bg-info/45 border-info";
    return `${base} ${sel ? "ring-2 ring-foreground ring-offset-1" : ""}`;
  };

  const overlay = (
    <>
      {zonas.map((z) => (
        <div
          key={z.id}
          className={`absolute border-2 rounded-sm cursor-pointer transition-colors ${colorZona(z)}`}
          style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }}
          title={z.nombre}
        />
      ))}
      {puntos.map((p) => {
        const est = puntoEstados[p.id];
        const base =
          est === "no_cumple"
            ? "bg-red-500/45 border-red-600"
            : est === "parcial"
              ? "bg-amber-400/45 border-amber-500"
              : est === "cumple"
                ? "bg-emerald-500/45 border-emerald-600"
                : "bg-slate-400/25 border-slate-500";
        return (
          <div
            key={p.id}
            className={`absolute border rounded-sm cursor-pointer ${base} ${p.id === puntoSeleccionadoId ? "ring-2 ring-primary" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.width}%`, height: `${p.height}%` }}
            title={p.nombre}
            onClick={(e) => { e.stopPropagation(); onPuntoClick?.(p); }}
          />
        );
      })}
      {pins.map((p, i) => (
        <div
          key={i}
          className={`absolute w-3 h-3 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 ${p.estado ? ESTADO_HALLAZGO_DOT[p.estado] : "bg-slate-500"}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          title={p.label}
        />
      ))}
    </>
  );

  if (usaGondolas) {
    return (
      <div className="relative w-full">
        <div
          ref={contRef}
          className="relative w-full overflow-hidden rounded-md border bg-muted/30 select-none cursor-pointer"
          style={{ aspectRatio: `${bbox.width} / ${bbox.height}` }}
          onClick={handleClick}
        >
          <FondoGondolasV2 gondolas={[]} bbox={bbox} sucursalId={plano.sucursal_id} />
          {overlay}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {imgUrl ? (
        <div
          ref={contRef}
          className="relative w-full overflow-hidden rounded-md border bg-muted/30 select-none cursor-pointer"
          onClick={handleClick}
        >
          <img src={imgUrl} alt={plano.nombre} className="w-full h-auto block pointer-events-none" draggable={false} />
          {overlay}
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
