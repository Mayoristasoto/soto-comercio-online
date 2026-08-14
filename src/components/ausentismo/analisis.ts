import { format } from "date-fns";
import type { CeldaMes, DiaAusentismo, FilaEmpleado, PersonaVacaciones } from "./types";

export const mesKey = (fecha: string) => fecha.slice(0, 7); // YYYY-MM
export const parseDia = (fecha: string) => new Date(fecha + "T00:00:00");
export const addDias = (fecha: string, n: number) => {
  const d = parseDia(fecha);
  d.setDate(d.getDate() + n);
  return format(d, "yyyy-MM-dd");
};

const celdaVacia = (): CeldaMes => ({ esperados: 0, ausentes: 0, justificadas: 0, sinJustificar: 0, indice: 0 });

const cerrar = (c: CeldaMes): CeldaMes => ({
  ...c,
  indice: c.esperados ? (c.ausentes * 100) / c.esperados : 0,
});

export interface ContextoPatrones {
  /** fechas (YYYY-MM-DD) de feriados activos */
  feriados: Set<string>;
  /** "sucursal_id|fecha" -> compañeros de vacaciones/licencia ese día */
  vacacionesPorDia: Map<string, PersonaVacaciones[]>;
}

export const personasDeVacaciones = (
  ctx: ContextoPatrones,
  a: Pick<DiaAusentismo, "sucursal_id" | "fecha" | "empleado_id">,
): PersonaVacaciones[] =>
  (ctx.vacacionesPorDia.get(`${a.sucursal_id || "-"}|${a.fecha}`) || []).filter((p) => p.empleado_id !== a.empleado_id);

/** Días clave: feriado, víspera de feriado, día posterior a feriado, o víspera de fin de semana (viernes/sábado según día siguiente no laborable). */
export function esDiaClave(fecha: string, diaSemana: number, feriados: Set<string>) {
  if (feriados.has(fecha)) return true;
  if (feriados.has(addDias(fecha, 1))) return true; // víspera
  if (feriados.has(addDias(fecha, -1))) return true; // día posterior
  if (diaSemana === 6 || diaSemana === 1) return true; // sábado o lunes (pegado al fin de semana)
  return false;
}

export function construirFilas(
  dias: DiaAusentismo[],
  mesesOrden: string[],
  ctx: ContextoPatrones,
  soloSinJustificar: boolean,
): FilaEmpleado[] {
  const porEmpleado = new Map<string, DiaAusentismo[]>();
  dias.forEach((d) => {
    const arr = porEmpleado.get(d.empleado_id);
    if (arr) arr.push(d);
    else porEmpleado.set(d.empleado_id, [d]);
  });

  const filas: FilaEmpleado[] = [];

  porEmpleado.forEach((registros, empleado_id) => {
    const primero = registros[0];
    const meses: Record<string, CeldaMes> = {};
    mesesOrden.forEach((m) => (meses[m] = celdaVacia()));
    const total = celdaVacia();
    const ausencias: DiaAusentismo[] = [];

    registros.forEach((r) => {
      const m = mesKey(r.fecha);
      const celda = meses[m] || (meses[m] = celdaVacia());
      const cuenta = r.es_ausente && (!soloSinJustificar || r.es_justificada !== true);
      if (r.es_esperado) {
        celda.esperados++;
        total.esperados++;
      }
      if (r.es_ausente) {
        if (r.es_justificada === true) {
          celda.justificadas++;
          total.justificadas++;
        } else {
          celda.sinJustificar++;
          total.sinJustificar++;
        }
      }
      if (cuenta) {
        celda.ausentes++;
        total.ausentes++;
        ausencias.push(r);
      }
    });

    mesesOrden.forEach((m) => (meses[m] = cerrar(meses[m])));
    const totalCerrado = cerrar(total);

    // Tendencia: últimos 3 meses vs. anteriores
    const ultimos = mesesOrden.slice(-3);
    const previos = mesesOrden.slice(0, -3);
    const prom = (lista: string[]) => {
      const conDatos = lista.map((m) => meses[m]).filter((c) => c && c.esperados > 0);
      if (!conDatos.length) return 0;
      const esperados = conDatos.reduce((s, c) => s + c.esperados, 0);
      const ausentes = conDatos.reduce((s, c) => s + c.ausentes, 0);
      return esperados ? (ausentes * 100) / esperados : 0;
    };
    const tendencia = prom(ultimos) - prom(previos);

    // Alertas
    const alertas: string[] = [];
    if (ausencias.length >= 3) {
      const porDia = new Map<number, number>();
      ausencias.forEach((a) => porDia.set(a.dia_semana, (porDia.get(a.dia_semana) || 0) + 1));
      const top = [...porDia.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] / ausencias.length >= 0.5) alertas.push("Patrón día de semana");

      const clave = ausencias.filter((a) => esDiaClave(a.fecha, a.dia_semana, ctx.feriados)).length;
      if (clave / ausencias.length >= 0.5) alertas.push("Vísperas / feriados");

      const conVac = ausencias.filter((a) => personasDeVacaciones(ctx, a).length > 0).length;
      if (conVac / ausencias.length >= 0.5) {
        // ¿Con quién coinciden? (empleado puntual o encargado)
        const conteo = new Map<string, { p: PersonaVacaciones; n: number }>();
        ausencias.forEach((a) =>
          personasDeVacaciones(ctx, a).forEach((p) => {
            const prev = conteo.get(p.empleado_id);
            if (prev) prev.n++;
            else conteo.set(p.empleado_id, { p, n: 1 });
          }),
        );
        const ranking = [...conteo.values()].sort((x, y) => y.n - x.n);
        const encargado = ranking.find((r) => r.p.es_encargado && r.n / ausencias.length >= 0.5);
        const top = ranking[0];
        if (encargado) alertas.push(`Coincide con vacaciones del encargado ${encargado.p.nombre}`);
        else if (top && top.n / ausencias.length >= 0.5)
          alertas.push(`Coincide con vacaciones de ${top.p.nombre}`);
        else alertas.push("Coincide con vacaciones de otros");
      }

      const enfermedad = ausencias.filter((a) => /enferm|m[eé]dic|salud/i.test(a.categoria_nombre || "")).length;
      if (enfermedad / ausencias.length >= 0.4) alertas.push("Alta tasa de enfermedad");
    }
    if (totalCerrado.sinJustificar >= 3) alertas.push("Sin justificar");

    filas.push({
      empleado_id,
      nombre: `${primero.empleado_apellido}, ${primero.empleado_nombre}`,
      legajo: primero.empleado_legajo,
      sucursal_nombre: primero.sucursal_nombre,
      meses,
      total: totalCerrado,
      tendencia,
      ausencias,
      alertas,
    });
  });

  return filas.sort((a, b) => b.total.indice - a.total.indice || a.nombre.localeCompare(b.nombre));
}

export interface PatronesEmpleado {
  porDiaSemana: { dia: number; cantidad: number }[];
  diasClave: number;
  conVacacionesDeOtros: number;
  porCategoria: { nombre: string; cantidad: number }[];
  rachaMax: number;
  mesesSobrePromedio: number;
}

export function calcularPatrones(fila: FilaEmpleado, mesesOrden: string[], ctx: ContextoPatrones): PatronesEmpleado {
  const porDia = new Map<number, number>();
  const porCat = new Map<string, number>();
  fila.ausencias.forEach((a) => {
    porDia.set(a.dia_semana, (porDia.get(a.dia_semana) || 0) + 1);
    const k = a.categoria_nombre || "Sin justificar";
    porCat.set(k, (porCat.get(k) || 0) + 1);
  });

  const fechas = [...fila.ausencias].map((a) => a.fecha).sort();
  let rachaMax = 0;
  let racha = 0;
  fechas.forEach((f, i) => {
    if (i > 0 && addDias(fechas[i - 1], 1) === f) racha++;
    else racha = 1;
    rachaMax = Math.max(rachaMax, racha);
  });

  const mesesSobrePromedio = mesesOrden.filter(
    (m) => fila.meses[m]?.esperados > 0 && fila.meses[m].indice > fila.total.indice,
  ).length;

  return {
    porDiaSemana: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, cantidad: porDia.get(dia) || 0 })),
    diasClave: fila.ausencias.filter((a) => esDiaClave(a.fecha, a.dia_semana, ctx.feriados)).length,
    conVacacionesDeOtros: fila.ausencias.filter(
      (a) => (ctx.vacacionesPorDia.get(`${a.sucursal_id || "-"}|${a.fecha}`) || 0) > 0,
    ).length,
    porCategoria: [...porCat.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, cantidad]) => ({ nombre, cantidad })),
    rachaMax,
    mesesSobrePromedio,
  };
}
