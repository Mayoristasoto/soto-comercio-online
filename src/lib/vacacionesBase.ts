// Cálculo local de vacaciones LCT permitiendo elegir la fecha base
// entre Fecha de ingreso, Antigüedad reconocida o Fecha prueba.

export type BaseVacaciones = "ingreso" | "reconocida" | "prueba";

export const BASE_VACACIONES_LABEL: Record<BaseVacaciones, string> = {
  ingreso: "Fecha de ingreso",
  reconocida: "Antigüedad reconocida",
  prueba: "Fecha prueba",
};

export interface EmpleadoFechasBase {
  fecha_ingreso: string | null;
  antiguedad_reconocida?: string | null;
  fecha_prueba?: string | null;
}

export function fechaBaseDe(emp: EmpleadoFechasBase, base: BaseVacaciones): string | null {
  if (base === "reconocida") return emp.antiguedad_reconocida || emp.fecha_ingreso || null;
  if (base === "prueba") return emp.fecha_prueba || emp.fecha_ingreso || null;
  return emp.fecha_ingreso || null;
}

/** Calcula días LCT y antigüedad al 31/12 del año dado a partir de la fecha base. */
export function calcularLCT(fechaBase: string | null, anio: number): { dias: number; antiguedadAnios: number; antiguedadMeses: number } {
  if (!fechaBase) return { dias: 0, antiguedadAnios: 0, antiguedadMeses: 0 };
  const base = new Date(fechaBase + "T00:00:00");
  const calc = new Date(anio, 11, 31);
  if (base > calc) return { dias: 0, antiguedadAnios: 0, antiguedadMeses: 0 };

  let anios = calc.getFullYear() - base.getFullYear();
  let meses = calc.getMonth() - base.getMonth();
  if (calc.getDate() < base.getDate()) meses -= 1;
  if (meses < 0) { anios -= 1; meses += 12; }
  const totalMeses = anios * 12 + meses;

  let dias: number;
  if (totalMeses < 6) {
    const diasTrab = Math.floor((calc.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    dias = Math.floor(diasTrab / 20);
  } else if (anios < 5) dias = 14;
  else if (anios < 10) dias = 21;
  else if (anios < 20) dias = 28;
  else dias = 35;

  return { dias, antiguedadAnios: anios, antiguedadMeses: totalMeses };
}
