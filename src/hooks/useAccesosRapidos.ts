import { useCallback, useEffect, useMemo, useState } from "react";

export interface AccesoRapido {
  path: string;
  nombre: string;
  icon: string;
}

const STORAGE_PREFIX = "accesos_rapidos_sidebar";

const storageKey = (userId?: string | null) => `${STORAGE_PREFIX}:${userId || "anon"}`;

const DEFAULTS: AccesoRapido[] = [
  { path: "/rrhh/checklist", nombre: "Checklist de Control", icon: "ClipboardCheck" },
];

export function useAccesosRapidos(userId?: string | null) {
  const key = useMemo(() => storageKey(userId), [userId]);
  const [accesos, setAccesos] = useState<AccesoRapido[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAccesos(Array.isArray(parsed) ? parsed : DEFAULTS);
      } else {
        setAccesos(DEFAULTS);
      }
    } catch {
      setAccesos(DEFAULTS);
    }
  }, [key]);

  const persistir = useCallback(
    (next: AccesoRapido[]) => {
      setAccesos(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
    },
    [key]
  );

  const toggle = useCallback(
    (acceso: AccesoRapido) => {
      const existe = accesos.some((a) => a.path === acceso.path);
      persistir(existe ? accesos.filter((a) => a.path !== acceso.path) : [...accesos, acceso]);
    },
    [accesos, persistir]
  );

  const quitar = useCallback(
    (path: string) => persistir(accesos.filter((a) => a.path !== path)),
    [accesos, persistir]
  );

  return { accesos, toggle, quitar, setAccesos: persistir };
}
