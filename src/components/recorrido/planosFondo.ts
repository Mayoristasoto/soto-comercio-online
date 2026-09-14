import planoJuanB from "@/assets/plano-juanb.png.asset.json";

export interface FondoPlano {
  /** Imagen del plano del salón (dibujo de arquitectura) */
  url: string | null;
  /** Tamaño del lienzo en unidades del layout */
  width: number;
  height: number;
}

const SIN_FONDO: FondoPlano = { url: null, width: 1000, height: 700 };

/** Plano de fondo del layout por sucursal (copia v2) */
const FONDOS: Record<string, FondoPlano> = {
  // José Martí
  "9682b6cf-f904-4497-918c-d0c9c061b9ec": {
    url: "/lovable-uploads/d3b32fd2-a19d-44d5-a8e2-b167fe688726.png",
    width: 1000,
    height: 700,
  },
  // Juan B. Justo
  "6ebfc1f0-6435-47af-99e7-4db5b06ced84": {
    url: planoJuanB.url,
    width: 1000,
    height: 919,
  },
};

export const fondoDe = (sucursalId?: string | null): FondoPlano =>
  (sucursalId && FONDOS[sucursalId]) || SIN_FONDO;
