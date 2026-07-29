import { useCallback, useEffect, useState } from "react";

export interface EdicionDia {
  entrada: string;
  salida: string;
  pausa: number;
}

/** Tramo provisorio: un empleado puede tener varios (horario cortado o multi-sucursal) */
export interface AgregadoDia extends EdicionDia {
  id: string;
  empleado_id: string;
  nombre: string;
  sucursal_id: string | null;
  sucursal_nombre: string;
}

export interface BorradorDia {
  ediciones: Record<string, EdicionDia>;
  agregados: AgregadoDia[];
  eliminados: string[];
  /** Horas extras por fila (key = real-<empleadoId> o tramo-<id>) */
  extras: Record<string, number>;
}

const VACIO: BorradorDia = { ediciones: {}, agregados: [], eliminados: [], extras: {} };

const storageKey = (fecha: string) => `fichero:borrador-dia:${fecha}`;

const nuevoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function leer(fecha: string): BorradorDia {
  try {
    const raw = localStorage.getItem(storageKey(fecha));
    if (!raw) return VACIO;
    const parsed = JSON.parse(raw);
    return {
      ediciones: parsed.ediciones ?? {},
      // compatibilidad con borradores viejos sin id
      agregados: (parsed.agregados ?? []).map((a: AgregadoDia) => ({ ...a, id: a.id ?? nuevoId() })),
      eliminados: parsed.eliminados ?? [],
      extras: parsed.extras ?? {},
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
    (updater: (prev: BorradorDia) => BorradorDia) => {
      setBorrador((prev) => {
      const next = updater(prev);
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
      return next;
      });
    },
    [fecha]
  );

  /** Edita una fila real (proveniente del turno asignado) */
  const editar = useCallback(
    (empleadoId: string, cambios: Partial<EdicionDia>, base: EdicionDia) => {
      persistir((prev) => {
        const actual = prev.ediciones[empleadoId] ?? base;
        return {
          ...prev,
          ediciones: { ...prev.ediciones, [empleadoId]: { ...actual, ...cambios } },
        };
      });
    },
    [persistir]
  );

  /** Edita un tramo provisorio (horario, pausa o sucursal) */
  const editarTramo = useCallback(
    (tramoId: string, cambios: Partial<Omit<AgregadoDia, "id" | "empleado_id" | "nombre">>) => {
      persistir((prev) => ({
        ...prev,
        agregados: prev.agregados.map((a) => (a.id === tramoId ? { ...a, ...cambios } : a)),
      }));
    },
    [persistir]
  );

  /** Agrega un tramo provisorio. Se permiten varios por empleado. */
  const agregar = useCallback(
    (fila: Omit<AgregadoDia, "id"> & { id?: string }) => {
      persistir((prev) => ({
        ...prev,
        agregados: [...prev.agregados, { ...fila, id: fila.id ?? nuevoId() }],
      }));
    },
    [persistir]
  );

  /** Agrega varios tramos de una (por ejemplo al dividir un turno) */
  const agregarVarios = useCallback(
    (filas: (Omit<AgregadoDia, "id"> & { id?: string })[], ocultarEmpleadoId?: string) => {
      persistir((prev) => ({
        ...prev,
        agregados: [...prev.agregados, ...filas.map((f) => ({ ...f, id: f.id ?? nuevoId() }))],
        eliminados: ocultarEmpleadoId
          ? [...new Set([...prev.eliminados, ocultarEmpleadoId])]
          : prev.eliminados,
      }));
    },
    [persistir]
  );

  /** Quita una fila real del día */
  const quitar = useCallback(
    (empleadoId: string) => {
      persistir((prev) => {
        const { [empleadoId]: _omit, ...restoEdiciones } = prev.ediciones;
        return {
          ...prev,
          ediciones: restoEdiciones,
          eliminados: [...new Set([...prev.eliminados, empleadoId])],
        };
      });
    },
    [persistir]
  );

  /** Quita un tramo provisorio */
  const quitarTramo = useCallback(
    (tramoId: string) => {
      persistir((prev) => ({
        ...prev,
        agregados: prev.agregados.filter((a) => a.id !== tramoId),
      }));
    },
    [persistir]
  );

  const restablecer = useCallback(() => persistir(() => VACIO), [persistir]);

  const tieneCambios =
    Object.keys(borrador.ediciones).length > 0 ||
    borrador.agregados.length > 0 ||
    borrador.eliminados.length > 0;

  return {
    borrador,
    editar,
    editarTramo,
    agregar,
    agregarVarios,
    quitar,
    quitarTramo,
    restablecer,
    tieneCambios,
  };
}
