import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GondolaV2 {
  id: string;
  type: string;
  section: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BBox { x: number; y: number; width: number; height: number }

const PAD = 40;

export const bboxDe = (gs: GondolaV2[]): BBox => {
  if (!gs.length) return { x: 0, y: 0, width: 1000, height: 700 };
  const minX = Math.min(...gs.map((g) => g.x));
  const minY = Math.min(...gs.map((g) => g.y));
  const maxX = Math.max(...gs.map((g) => g.x + g.width));
  const maxY = Math.max(...gs.map((g) => g.y + g.height));
  return { x: minX - PAD, y: minY - PAD, width: maxX - minX + PAD * 2, height: maxY - minY + PAD * 2 };
};

/** Convierte una góndola del layout v2 a coordenadas porcentuales (0-100) sobre el plano */
export const gondolaAPorcentaje = (g: GondolaV2, b: BBox) => ({
  x: ((g.x - b.x) / b.width) * 100,
  y: ((g.y - b.y) / b.height) * 100,
  width: (g.width / b.width) * 100,
  height: (g.height / b.height) * 100,
});

export const cargarGondolasV2 = async (sucursalId?: string | null): Promise<GondolaV2[]> => {
  let q = supabase
    .from("gondolas_v2")
    .select("id, type, section, status, position_x, position_y, position_width, position_height")
    .order("created_at", { ascending: true });
  if (sucursalId) q = q.eq("sucursal_id", sucursalId);
  const { data } = await q;
  return (data ?? []).map((d: any) => ({
    id: d.id,
    type: d.type,
    section: d.section ?? d.id,
    status: d.status,
    x: Number(d.position_x),
    y: Number(d.position_y),
    width: Number(d.position_width),
    height: Number(d.position_height),
  }));
};

/** Carga el layout de góndolas (copia v2) de una sucursal para usarlo como fondo del recorrido */
export function useFondoGondolasV2(activo: boolean, sucursalId?: string | null) {
  const [gondolas, setGondolas] = useState<GondolaV2[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!activo) return;
    setCargando(true);
    cargarGondolasV2(sucursalId).then((gs) => {
      setGondolas(gs);
      setCargando(false);
    });
  }, [activo, sucursalId]);

  return { gondolas, bbox: bboxDe(gondolas), cargando };
}

/** Mismos colores que el editor de layout: verde = libre, rojo = ocupada */
const colorEstado = (status: string) =>
  status === "occupied"
    ? { fill: "#fca5a5", stroke: "#dc2626" }
    : { fill: "#86efac", stroke: "#16a34a" };

/** Dibujo del layout de góndolas como fondo estático (no edita nada del editor original) */
export function FondoGondolasV2({
  gondolas,
  bbox,
  sucursalId,
}: {
  gondolas: GondolaV2[];
  bbox: BBox;
  sucursalId?: string | null;
}) {
  const fondo = fondoDe(sucursalId);
  return (
    <svg
      viewBox={`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`}
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} fill="#f8fafc" />
      {/* Plano del salón de la sucursal */}
      {fondo.url && (
        <image
          href={fondo.url}
          x={0}
          y={0}
          width={fondo.width}
          height={fondo.height}
          opacity={0.35}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {gondolas.map((g) => {
        const c = colorEstado(g.status);
        return (
          <g key={g.id}>
            <rect
              x={g.x}
              y={g.y}
              width={g.width}
              height={g.height}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={2}
              rx={4}
            />
            <text
              x={g.x + g.width / 2}
              y={g.y + g.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(10, Math.min(g.width, g.height) * 0.35)}
              fill="#334155"
              fontWeight="600"
            >
              {g.section}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
