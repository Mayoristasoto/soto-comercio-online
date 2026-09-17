import { supabase } from "@/integrations/supabase/client";
import { cargarGondolasV2, gondolaAPorcentaje, type BBox } from "./FondoGondolasV2";
import { fondoDe } from "./planosFondo";
import { TIPO_ESPACIO_LABEL, type TipoEspacio } from "./recorridoTypes";

/**
 * Deja el plano del recorrido igual al mapa de góndolas (gondolas_v2) de la sucursal.
 * Un único set de recuadros: se edita en el mapa de góndolas y el recorrido lo refleja.
 * Conserva los hallazgos históricos (no borra nada que tenga historial de la góndola).
 */
export async function sincronizarEspaciosDesdeGondolas(
  sucursalId: string,
  nombreSucursal = "Plano"
): Promise<{ total: number; planoId: string } | null> {
  const gondolas = await cargarGondolasV2(sucursalId);
  if (!gondolas.length) return null;

  const fondo = fondoDe(sucursalId);
  const bbox: BBox = { x: 0, y: 0, width: fondo.width, height: fondo.height };

  // plano de la sucursal (usa el layout de góndolas como fondo)
  const { data: planoPrev } = await supabase
    .from("recorrido_planos")
    .select("id")
    .eq("sucursal_id", sucursalId)
    .maybeSingle();

  let planoId = planoPrev?.id ?? null;
  if (planoId) {
    await supabase
      .from("recorrido_planos")
      .update({ usa_gondolas: true, ancho: fondo.width, alto: fondo.height })
      .eq("id", planoId);
  } else {
    const { data, error } = await supabase
      .from("recorrido_planos")
      .insert({
        sucursal_id: sucursalId,
        nombre: `Plano ${nombreSucursal}`,
        ancho: fondo.width,
        alto: fondo.height,
        usa_gondolas: true,
      })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("No se pudo crear el plano");
    planoId = data.id;
  }

  const { data: zonasPrev } = await supabase
    .from("recorrido_zonas")
    .select("id, gondola_ref")
    .eq("plano_id", planoId);
  const zonas = (zonasPrev ?? []) as { id: string; gondola_ref: string | null }[];
  const porRef = new Map(zonas.filter((z) => z.gondola_ref).map((z) => [z.gondola_ref as string, z.id]));

  const nombreDe = (tipo: string, section: string) =>
    `${TIPO_ESPACIO_LABEL[tipo as TipoEspacio] ?? tipo} ${section}`;

  // 1) actualizar las que ya existen
  const nuevas = [] as { ref: string; fila: Record<string, unknown> }[];
  for (let i = 0; i < gondolas.length; i++) {
    const g = gondolas[i];
    const pct = gondolaAPorcentaje(g, bbox);
    const zonaId = porRef.get(g.id);
    const datos = { nombre: nombreDe(g.type, g.section), orden: i, rotation: g.rotation ?? 0, ...pct };
    if (zonaId) {
      await supabase.from("recorrido_zonas").update(datos).eq("id", zonaId);
      const { data: ptPrev } = await supabase
        .from("recorrido_puntos")
        .select("id")
        .eq("zona_id", zonaId)
        .eq("gondola_ref", g.id)
        .maybeSingle();
      const datosPunto = {
        nombre: g.section,
        gondola_ref: g.id,
        tipo_espacio: g.type,
        orden: i,
        rotation: g.rotation ?? 0,
        ...pct,
      };
      if (ptPrev?.id) {
        await supabase.from("recorrido_puntos").update(datosPunto).eq("id", ptPrev.id);
      } else {
        await supabase.from("recorrido_puntos").insert({ zona_id: zonaId, ...datosPunto });
      }
    } else {
      nuevas.push({ ref: g.id, fila: { plano_id: planoId, gondola_ref: g.id, ...datos } });
    }
  }

  // 2) crear las que faltan (zona + punto de control)
  if (nuevas.length) {
    const { data: creadas, error } = await supabase
      .from("recorrido_zonas")
      .insert(nuevas.map((n) => n.fila))
      .select("id, gondola_ref, orden");
    if (error) throw error;
    const filasPuntos = (creadas ?? []).map((z: any) => {
      const g = gondolas.find((x) => x.id === z.gondola_ref)!;
      return {
        zona_id: z.id,
        nombre: g.section,
        gondola_ref: g.id,
        tipo_espacio: g.type,
        orden: z.orden,
        rotation: g.rotation ?? 0,
        ...gondolaAPorcentaje(g, bbox),
      };
    });
    if (filasPuntos.length) await supabase.from("recorrido_puntos").insert(filasPuntos);
  }

  // 3) borrar los espacios que ya no existen en el mapa de góndolas
  const refsActuales = new Set(gondolas.map((g) => g.id));
  const sobrantes = zonas.filter((z) => !z.gondola_ref || !refsActuales.has(z.gondola_ref)).map((z) => z.id);
  if (sobrantes.length) {
    const { data: ptsSobrantes } = await supabase.from("recorrido_puntos").select("id").in("zona_id", sobrantes);
    const idsPuntos = (ptsSobrantes ?? []).map((p: { id: string }) => p.id);
    if (idsPuntos.length) {
      await supabase.from("recorrido_hallazgos").update({ punto_id: null }).in("punto_id", idsPuntos);
      await supabase.from("recorrido_puntos").delete().in("id", idsPuntos);
    }
    await supabase.from("recorrido_hallazgos").update({ zona_id: null }).in("zona_id", sobrantes);
    await supabase.from("recorrido_zonas").delete().in("id", sobrantes);
  }

  return { total: gondolas.length, planoId: planoId as string };
}
