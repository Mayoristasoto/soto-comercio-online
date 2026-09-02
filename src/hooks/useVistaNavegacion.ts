import { useCallback, useEffect, useMemo, useState } from "react";

export type VistaNavegacion = "vista1" | "vista2";

const STORAGE_PREFIX = "vista_navegacion";

const storageKey = (userId?: string | null) => `${STORAGE_PREFIX}:${userId || "anon"}`;

export function useVistaNavegacion(userId?: string | null) {
  const key = useMemo(() => storageKey(userId), [userId]);
  const [vista, setVista] = useState<VistaNavegacion>("vista1");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setVista(raw === "vista2" ? "vista2" : "vista1");
    } catch {
      setVista("vista1");
    } finally {
      setCargando(false);
    }
  }, [key]);

  const cambiarVista = useCallback(
    (next: VistaNavegacion) => {
      setVista(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // ignore quota errors
      }
    },
    [key]
  );

  return { vista, cambiarVista, cargando };
}
