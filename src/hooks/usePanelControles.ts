import { useCallback, useEffect, useMemo, useState } from "react";
import { CONTROLES_DEFAULT } from "@/lib/controlesCatalogo";

const PREFIX = "panel_controles_secciones";

export function usePanelControles(userId?: string | null) {
  const key = useMemo(() => `${PREFIX}:${userId || "anon"}`, [userId]);
  const [claves, setClaves] = useState<string[]>(CONTROLES_DEFAULT);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      setClaves(Array.isArray(parsed) ? parsed : CONTROLES_DEFAULT);
    } catch {
      setClaves(CONTROLES_DEFAULT);
    }
    setCargado(true);
  }, [key]);

  const persistir = useCallback(
    (next: string[]) => {
      setClaves(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignorar errores de cuota
      }
    },
    [key]
  );

  const toggle = useCallback(
    (clave: string) =>
      persistir(claves.includes(clave) ? claves.filter((c) => c !== clave) : [...claves, clave]),
    [claves, persistir]
  );

  const mover = useCallback(
    (clave: string, direccion: -1 | 1) => {
      const i = claves.indexOf(clave);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= claves.length) return;
      const next = [...claves];
      [next[i], next[j]] = [next[j], next[i]];
      persistir(next);
    },
    [claves, persistir]
  );

  return { claves, cargado, toggle, mover, setClaves: persistir };
}
