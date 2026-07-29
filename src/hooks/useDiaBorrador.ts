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
}

const VACIO: BorradorDia = { ediciones: {}, agregados: [], eliminados: [] };

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

  /** Edita una fila real (proveniente del turno asignado) */
  const editar = useCallback(
    (empleadoId: string, cambios: Partial<EdicionDia>, base: EdicionDia) => {
      const actual = borrador.ediciones[empleadoId] ?? base;
      persistir({
        ...borrador,
        ediciones: { ...borrador.ediciones, [empleadoId]: { ...actual, ...cambios } },
      });
    },
    [borrador, persistir]
  );

  /** Edita un tramo provisorio (horario, pausa o sucursal) */
  const editarTramo = useCallback(
    (tramoId: string, cambios: Partial<Omit<AgregadoDia, "id" | "empleado_id" | "nombre">>) => {
      persistir({
        ...borrador,
        agregados: borrador.agregados.map((a) => (a.id === tramoId ? { ...a, ...cambios } : a)),
      });
    },
    [borrador, persistir]
  );

  /** Agrega un tramo provisorio. Se permiten varios por empleado. */
  const agregar = useCallback(
    (fila: Omit<AgregadoDia, "id"> & { id?: string }) => {
      persistir({
        ...borrador,
        agregados: [...borrador.agregados, { ...fila, id: fila.id ?? nuevoId() }],
      });
    },
    [borrador, persistir]
  );

  /** Agrega varios tramos de una (por ejemplo al dividir un turno) */
  const agregarVarios = useCallback(
    (filas: (Omit<AgregadoDia, "id"> & { id?: string })[], ocultarEmpleadoId?: string) => {
      persistir({
        ...borrador,
        agregados: [
          ...borrador.agregados,
          ...filas.map((f) => ({ ...f, id: f.id ?? nuevoId() })),
        ],
        eliminados: ocultarEmpleadoId
          ? [...new Set([...borrador.eliminados, ocultarEmpleadoId])]
          : borrador.eliminados,
      });
    },
    [borrador, persistir]
  );

  /** Quita una fila real del día */
  const quitar = useCallback(
    (empleadoId: string) => {
      const { [empleadoId]: _omit, ...restoEdiciones } = borrador.ediciones;
      persistir({
        ...borrador,
        ediciones: restoEdiciones,
        eliminados: [...new Set([...borrador.eliminados, empleadoId])],
      });
    },
    [borrador, persistir]
  );

  /** Quita un tramo provisorio */
  const quitarTramo = useCallback(
    (tramoId: string) => {
      persistir({
        ...borrador,
        agregados: borrador.agregados.filter((a) => a.id !== tramoId),
      });
    },
    [borrador, persistir]
  );

  const restablecer = useCallback(() => persistir(VACIO), [persistir]);

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
