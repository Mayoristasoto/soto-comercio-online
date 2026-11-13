import { validarTurnos, type AusenciaH2, type TurnoH2 } from "./horario2";

const MS_DIA = 86400000;
const aFecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Prepara el movimiento conjunto de varios turnos seleccionados (estilo Excel):
 * el desplazamiento se calcula desde el turno ancla hasta la celda destino y se
 * aplica igual a todos los seleccionados, conservando las distancias entre ellos.
 */
export function prepararMovimientoMultiple<T extends TurnoH2>(
  existentes: T[],
  idsSeleccionados: string[],
  anclaId: string,
  empleadosOrdenados: string[],
  empleadoDestino: string,
  fechaDestino: string,
  habilitados: Record<string, string[]>,
  ausencias: AusenciaH2[],
): { turnos: T[]; error: string | null } {
  const ids = new Set(idsSeleccionados);
  const seleccionados = existentes.filter(t => ids.has(t.id));
  const ancla = seleccionados.find(t => t.id === anclaId);
  if (!ancla || seleccionados.length < 2) {
    return { turnos: [], error: "Seleccioná al menos dos turnos con Ctrl+clic" };
  }
  const idxAncla = empleadosOrdenados.indexOf(ancla.empleado_id);
  const idxDestino = empleadosOrdenados.indexOf(empleadoDestino);
  if (idxAncla < 0 || idxDestino < 0) {
    return { turnos: [], error: "El destino está fuera de la grilla" };
  }
  const deltaEmpleado = idxDestino - idxAncla;
  const deltaDias = Math.round(
    (new Date(fechaDestino + "T00:00:00").getTime() - new Date(ancla.fecha + "T00:00:00").getTime()) / MS_DIA,
  );
  const movidos: T[] = [];
  for (const t of seleccionados) {
    const nuevaFila = empleadosOrdenados.indexOf(t.empleado_id) + deltaEmpleado;
    if (nuevaFila < 0 || nuevaFila >= empleadosOrdenados.length) {
      return { turnos: [], error: "El movimiento saca turnos de la grilla" };
    }
    const d = new Date(t.fecha + "T00:00:00");
    d.setDate(d.getDate() + deltaDias);
    movidos.push({ ...t, empleado_id: empleadosOrdenados[nuevaFila], fecha: aFecha(d) });
  }
  const otros = existentes.filter(t => !ids.has(t.id));
  const destinos = new Set(movidos.map(t => `${t.empleado_id}|${t.fecha}`));
  const aviso = validarTurnos([...otros, ...movidos], habilitados, ausencias)
    .find(a => a.critico && destinos.has(`${a.empleado_id}|${a.fecha}`));
  return {
    turnos: movidos,
    error: aviso ? `${aviso.fecha.split("-").reverse().join("/")}: ${aviso.mensaje}` : null,
  };
}

/** Arrastrar siempre copia el turno (el original queda); solo mueve si se arrastra con Shift apretado. */
export function modoArrastre(conShift: boolean): "copiar" | "mover" {
  return conShift ? "mover" : "copiar";
}

/**
 * Valida copias de turnos: los originales se conservan, así que las copias se
 * validan junto con todos los turnos existentes (superposición, vacaciones,
 * puestos habilitados) en sus celdas destino.
 */
export function prepararCopiaTurnos<T extends TurnoH2>(
  existentes: T[],
  copias: T[],
  habilitados: Record<string, string[]>,
  ausencias: AusenciaH2[],
): { turnos: T[]; error: string | null } {
  if (!copias.length) return { turnos: [], error: "No hay turnos para copiar" };
  const conId = copias.map((t, i) => ({ ...t, id: `copia-${i}` }));
  const destinos = new Set(conId.map(t => `${t.empleado_id}|${t.fecha}`));
  if (destinos.size !== conId.length) return { turnos: [], error: "Dos copias caen en la misma celda" };
  const aviso = validarTurnos([...existentes, ...conId], habilitados, ausencias)
    .find(a => a.critico && destinos.has(`${a.empleado_id}|${a.fecha}`));
  return {
    turnos: conId,
    error: aviso ? `${aviso.fecha.split("-").reverse().join("/")}: ${aviso.mensaje}` : null,
  };
}

/**
 * Cuando una copia cae sobre turnos existentes: qué turnos del destino se
 * reemplazarían, si reemplazarlos deja la copia válida, y si agregarla igual
 * (superpuesta) solo choca por superposición y no por otro motivo crítico.
 */
export function conflictosCopia<T extends TurnoH2>(
  existentes: T[],
  copias: T[],
  habilitados: Record<string, string[]>,
  ausencias: AusenciaH2[],
): { reemplazables: string[]; errorReemplazando: string | null; errorAgregando: string | null } {
  const destinos = new Set(copias.map(t => `${t.empleado_id}|${t.fecha}`));
  const reemplazables = existentes.filter(t => t.id && destinos.has(`${t.empleado_id}|${t.fecha}`)).map(t => t.id as string);
  const restantes = existentes.filter(t => !reemplazables.includes(t.id as string));
  const errorReemplazando = prepararCopiaTurnos(restantes, copias, habilitados, ausencias).error;
  const conId = copias.map((t, i) => ({ ...t, id: `copia-${i}` }));
  const aviso = validarTurnos([...existentes, ...conId], habilitados, ausencias)
    .find(a => a.critico && a.tipo !== "superposicion" && destinos.has(`${a.empleado_id}|${a.fecha}`));
  return { reemplazables, errorReemplazando, errorAgregando: aviso ? aviso.mensaje : null };
}
