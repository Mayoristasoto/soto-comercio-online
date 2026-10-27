import { copiarTurnos, validarTurnos, type AusenciaH2, type TurnoH2 } from "./horario2";

export function prepararExtensionTurno<T extends TurnoH2>(
  turno: T, antes: number, despues: number, semana: string,
  existentes: TurnoH2[], habilitados: Record<string, string[]>, ausencias: AusenciaH2[],
) {
  if (![antes, despues].every(n => Number.isInteger(n) && n >= 0) || antes + despues > 2) {
    return { turnos: [], error: "Seleccioná entre uno y tres días" };
  }
  const finSemana = copiarTurnos([{ ...turno, fecha: semana }], 6, turno.sucursal_id)[0].fecha;
  const turnos = Array.from({ length: antes + despues + 1 }, (_, i) => {
    const desfase = i - antes;
    return desfase === 0 ? { ...turno } : copiarTurnos([turno], desfase, turno.sucursal_id)[0];
  });
  if (turnos.some(t => t.fecha < semana || t.fecha > finSemana)) {
    return { turnos: [], error: "La extensión debe quedar dentro de esta semana" };
  }
  const fechas = new Set(turnos.map(t => t.fecha));
  const otros = existentes.filter(t => !turno.id || t.id !== turno.id);
  const aviso = validarTurnos([...otros, ...turnos], habilitados, ausencias)
    .find(a => a.critico && a.empleado_id === turno.empleado_id && fechas.has(a.fecha));
  return { turnos, error: aviso ? `${aviso.fecha.split("-").reverse().join("/")}: ${aviso.mensaje}` : null };
}