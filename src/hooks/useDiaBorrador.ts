import { useCallback, useEffect, useState } from "react";

export interface EdicionDia {
  entrada: string;
  salida: string;
  pausa: number;
}

export interface AgregadoDia extends EdicionDia {
  empleado_id: string;
  nombre: string;
  sucursal_id: string | null;
  sucursal_nombre: string;
}

export interface BorradorDia {
  ediciones: Record<string, EdicionDia>;
  agregados: AgregadoDia[];
  eliminados: string[];
}

const VACIO: BorradorDia = { ediciones: {}, agregados: [], eliminados: [] };

const storageKey = (fecha: string) => `fichero:borrador-dia:${fecha}`;

function leer(fecha: string): BorradorDia {
  try {
    const raw = localStorage.getItem(storageKey(fecha));
    if (!raw) return VACIO;
    const parsed = JSON.parse(raw);
    return {
      ediciones: parsed.ediciones ?? {},
      agregados: parsed.agregados ?? [],
      eliminados: parsed.eliminados ?? [],
    };
  } catch {
    return VACIO;
  }
}

/**
 * Borrador local (no persiste en base de datos) para simular la organización
 * de un día puntual. Se guarda en localStorage por fecha.
 */
export function useDiaBorrador(fecha: string) {
  const [borrador, setBorrador] = useState<BorradorDia>(() => leer(fecha));

  useEffect(() => {
    setBorrador(leer(fecha));
  }, [fecha]);

  const persistir = useCallback(
    (next: BorradorDia) => {
      setBorrador(next);
      try {
        const vacio =
          Object.keys(next.ediciones).length === 0 &&
          next.agregados.length === 0 &&
          next.eliminados.length === 0;
        if (vacio) localStorage.removeItem(storageKey(fecha));
        else localStorage.setItem(storageKey(fecha), JSON.stringify(next));
      } catch {
        /* storage lleno o bloqueado: el borrador sigue en memoria */
      }
    },
    [fecha]
  );

  const editar = useCallback(
    (empleadoId: string, cambios: Partial<EdicionDia>, base: EdicionDia) => {
      const actual = borrador.ediciones[empleadoId] ?? base;
      persistir({
        ...borrador,
        ediciones: { ...borrador.ediciones, [empleadoId]: { ...actual, ...cambios } },
        agregados: borrador.agregados.map((a) =>
          a.empleado_id === empleadoId ? { ...a, ...cambios } : a
        ),
      });
    },
    [borrador, persistir]
  );

  const agregar = useCallback(
    (fila: AgregadoDia) => {
      if (borrador.agregados.some((a) => a.empleado_id === fila.empleado_id)) return;
      persistir({
        ...borrador,
        agregados: [...borrador.agregados, fila],
        eliminados: borrador.eliminados.filter((id) => id !== fila.empleado_id),
      });
    },
    [borrador, persistir]
  );

  const quitar = useCallback(
    (empleadoId: string) => {
      const esAgregado = borrador.agregados.some((a) => a.empleado_id === empleadoId);
      const { [empleadoId]: _omit, ...restoEdiciones } = borrador.ediciones;
      persistir({
        ediciones: restoEdiciones,
        agregados: borrador.agregados.filter((a) => a.empleado_id !== empleadoId),
        eliminados: esAgregado
          ? borrador.eliminados
          : [...new Set([...borrador.eliminados, empleadoId])],
      });
    },
    [borrador, persistir]
  );

  const restablecer = useCallback(() => persistir(VACIO), [persistir]);

  const tieneCambios =
    Object.keys(borrador.ediciones).length > 0 ||
    borrador.agregados.length > 0 ||
    borrador.eliminados.length > 0;

  return { borrador, editar, agregar, quitar, restablecer, tieneCambios };
}
