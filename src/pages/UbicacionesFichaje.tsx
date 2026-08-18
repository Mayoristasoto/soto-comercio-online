import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";
import { Loader2, MapPin, FileSpreadsheet, FileDown, Search, ExternalLink, Smartphone, ScanFace } from "lucide-react";
import { formatArgentinaDate, formatArgentinaTime } from "@/lib/dateUtils";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import { getEmpleadosDeSeleccion, type SeleccionEmpleados } from "@/lib/gruposEmpleados";
import PuntosFichajeManager from "@/components/fichero/PuntosFichajeManager";
import {
  exportUbicacionesPDF,
  exportUbicacionesXLSX,
  type FilaUbicacion,
  type ResumenUbicacion,
  type ResumenDias,
} from "@/utils/ubicacionesFichajeExport";

interface Sucursal { id: string; nombre: string }
interface EmpleadoLite {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  sucursal_id: string | null;
  activo: boolean;
}

const TODAS = "__todas__";

const SIN_GPS = "Sin GPS";
const FUERA = "Fuera de ubicación";

const clasificar = (dentro: boolean, punto: string | null, lat: number | null) => {
  if (lat == null) return SIN_GPS;
  if (dentro && punto) return punto;
  return FUERA;
};

const origenDe = (metodo: string, dentro: boolean, lat: number | null) => {
  if (metodo === "facial") return "Kiosco (facial)";
  if (metodo === "manual") return "Carga manual";
  if (lat == null) return "Sin GPS";
  return dentro ? "PIN en el local" : "PIN fuera del local (celular)";
};

export default function UbicacionesFichaje() {
  const hoy = new Date();
  const [desde, setDesde] = useState(format(startOfMonth(hoy), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(hoy, "yyyy-MM-dd"));
  const [sucursalFiltro, setSucursalFiltro] = useState(TODAS);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionGrupo, setSeleccionGrupo] = useState<SeleccionEmpleados | null>(null);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoLite[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [filas, setFilas] = useState<FilaUbicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [soloEntradaSalida, setSoloEntradaSalida] = useState(false);
  const [porJornada, setPorJornada] = useState(false);
  const [soloHabiles, setSoloHabiles] = useState(true);
  const [contarFeriados, setContarFeriados] = useState(true);
  const [feriados, setFeriados] = useState<{ fecha: string; nombre: string }[]>([]);


  useEffect(() => {
    (async () => {
      const [s, e] = await Promise.all([
        supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
        supabase
          .from("empleados")
          .select("id,nombre,apellido,legajo,sucursal_id,activo")
          .eq("activo", true)
          .order("apellido"),
      ]);
      setSucursales((s.data as Sucursal[]) || []);
      const emps = (e.data as EmpleadoLite[]) || [];
      setEmpleados(emps);
      const initial: Record<string, boolean> = {};
      emps.forEach((emp) => (initial[emp.id] = true));
      setChecked(initial);
    })();
  }, []);

  // Aplicar grupo guardado a los checkboxes
  useEffect(() => {
    (async () => {
      if (!seleccionGrupo) return;
      const ids = await getEmpleadosDeSeleccion(seleccionGrupo);
      const next: Record<string, boolean> = {};
      empleados.forEach((e) => (next[e.id] = ids.includes(e.id)));
      setChecked(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionGrupo]);

  // Feriados del período
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dias_feriados")
        .select("fecha,nombre")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .eq("activo", true)
        .order("fecha");
      setFeriados((data as { fecha: string; nombre: string }[]) || []);
    })();
  }, [desde, hasta]);

  // Días hábiles del período: lunes a sábado (sin domingos)
  const diasHabilesInfo = useMemo(() => {
    const ini = new Date(`${desde}T12:00:00`);
    const fin = new Date(`${hasta}T12:00:00`);
    let habiles = 0;
    let domingos = 0;
    const fechasHabiles: string[] = [];
    const feriadosSet = new Set(feriados.map((f) => f.fecha));
    const cur = new Date(ini);
    while (cur <= fin) {
      const f = format(cur, "yyyy-MM-dd");
      if (cur.getDay() === 0) domingos++;
      else {
        habiles++;
        if (contarFeriados || !feriadosSet.has(f)) fechasHabiles.push(f);
      }
      cur.setDate(cur.getDate() + 1);
    }
    const feriadosHabiles = feriados.filter((f) => new Date(`${f.fecha}T12:00:00`).getDay() !== 0);
    return {
      habiles,
      domingos,
      feriadosHabiles,
      fechasHabiles,
      habilesNetos: contarFeriados ? habiles : habiles - feriadosHabiles.length,
    };
  }, [desde, hasta, feriados, contarFeriados]);



  const empleadosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((e) => {
      if (sucursalFiltro !== TODAS && e.sucursal_id !== sucursalFiltro) return false;
      if (!q) return true;
      return `${e.apellido} ${e.nombre} ${e.legajo || ""}`.toLowerCase().includes(q);
    });
  }, [empleados, sucursalFiltro, busqueda]);

  const seleccionados = useMemo(() => empleados.filter((e) => checked[e.id]).map((e) => e.id), [empleados, checked]);

  const toggleTodos = (valor: boolean) => {
    const next = { ...checked };
    empleadosVisibles.forEach((e) => (next[e.id] = valor));
    setChecked(next);
  };

  const cargar = async () => {
    if (seleccionados.length === 0) {
      toast.error("Seleccioná al menos un empleado");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_fichajes_ubicaciones", {
      p_desde: new Date(`${desde}T00:00:00-03:00`).toISOString(),
      p_hasta: new Date(`${hasta}T23:59:59-03:00`).toISOString(),
      p_empleados: seleccionados,
    });
    setLoading(false);
    if (error) {
      toast.error("No se pudo generar el informe: " + error.message);
      return;
    }
    const rows: FilaUbicacion[] = ((data as any[]) || []).map((r) => {
      const lat = r.latitud != null ? Number(r.latitud) : null;
      const dentro = !!r.dentro_radio;
      return {
        fichaje_id: r.fichaje_id,
        empleado_id: r.empleado_id,
        empleado: `${r.empleado_apellido} ${r.empleado_nombre}`.trim(),
        legajo: empleados.find((e) => e.id === r.empleado_id)?.legajo ?? null,
        sucursal_nombre: r.sucursal_nombre,
        tipo: r.tipo,
        metodo: r.metodo,
        timestamp_real: r.timestamp_real,
        latitud: lat,
        longitud: r.longitud != null ? Number(r.longitud) : null,
        punto_nombre: r.punto_nombre,
        centro_costo_nombre: dentro ? r.centro_costo_nombre : null,
        distancia_metros: r.distancia_metros != null ? Number(r.distancia_metros) : null,
        dentro_radio: dentro,
        clasificacion: clasificar(dentro, r.punto_nombre, lat),
        origen: origenDe(r.metodo, dentro, lat),
      };
    });
    setFilas(rows);
    setCargado(true);
  };

  // Vista aplicando los toggles
  const filasVista = useMemo(() => {
    let base = filas;
    if (soloEntradaSalida) base = base.filter((f) => f.tipo === "entrada" || f.tipo === "salida");
    if (soloHabiles) {
      base = base.filter((f) => new Date(`${formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd")}T12:00:00`).getDay() !== 0);
    }
    if (!contarFeriados && feriados.length) {
      const set = new Set(feriados.map((f) => f.fecha));
      base = base.filter((f) => !set.has(formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd")));
    }

    if (porJornada) {
      const map = new Map<string, FilaUbicacion>();
      base.forEach((f) => {
        const fecha = formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd");
        const key = `${f.empleado_id}|${fecha}|${f.clasificacion}`;
        const prev = map.get(key);
        if (!prev || f.timestamp_real < prev.timestamp_real) map.set(key, f);
      });
      base = Array.from(map.values()).sort((a, b) =>
        a.timestamp_real < b.timestamp_real ? -1 : a.timestamp_real > b.timestamp_real ? 1 : 0,
      );
    }
    return base;
  }, [filas, soloEntradaSalida, porJornada, soloHabiles, contarFeriados, feriados]);

  const puntosUsados = useMemo(() => {
    const set = new Set<string>();
    filasVista.forEach((f) => {
      if (f.clasificacion !== SIN_GPS && f.clasificacion !== FUERA) set.add(f.clasificacion);
    });
    return Array.from(set).sort();
  }, [filasVista]);

  const resumen = useMemo<ResumenUbicacion[]>(() => {
    const map = new Map<string, ResumenUbicacion & { centros: Set<string> }>();
    filasVista.forEach((f) => {
      let r = map.get(f.empleado_id);
      if (!r) {
        r = {
          empleado: f.empleado,
          legajo: f.legajo,
          sucursal_nombre: f.sucursal_nombre,
          total: 0,
          porPunto: {},
          sinGps: 0,
          fueraUbicacion: 0,
          pctFuera: 0,
          centrosCosto: "",
          centros: new Set<string>(),
        };
        map.set(f.empleado_id, r);
      }
      r.total += 1;
      if (f.clasificacion === SIN_GPS) r.sinGps += 1;
      else if (f.clasificacion === FUERA) r.fueraUbicacion += 1;
      else {
        r.porPunto[f.clasificacion] = (r.porPunto[f.clasificacion] || 0) + 1;
        if (f.centro_costo_nombre) r.centros.add(f.centro_costo_nombre);
      }
    });
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        pctFuera: r.total ? (r.fueraUbicacion / r.total) * 100 : 0,
        centrosCosto: Array.from(r.centros).join(", "),
      }))
      .sort((a, b) => a.empleado.localeCompare(b.empleado));
  }, [filasVista]);

  // Horas extras por empleado/día (jornada estándar 8 h, la pausa ya está contemplada)
  const redondearExtras = (horas: number) => {
    if (horas <= 0) return 0;
    const enteras = Math.floor(horas);
    const min = Math.round((horas - enteras) * 60);
    if (min >= 45) return enteras + 1;
    if (min >= 19) return enteras + 0.5;
    return enteras;
  };

  const extrasPorEmpleado = useMemo(() => {
    // Usamos las filas con los mismos filtros de día pero siempre con entrada/salida
    let base = filas.filter((f) => f.tipo === "entrada" || f.tipo === "salida");
    if (soloHabiles) {
      base = base.filter(
        (f) => new Date(`${formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd")}T12:00:00`).getDay() !== 0,
      );
    }
    if (!contarFeriados && feriados.length) {
      const set = new Set(feriados.map((f) => f.fecha));
      base = base.filter((f) => !set.has(formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd")));
    }
    const porDia = new Map<string, { entrada?: string; salida?: string }>();
    base.forEach((f) => {
      const fecha = formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd");
      const key = `${f.empleado_id}|${fecha}`;
      const cur = porDia.get(key) || {};
      if (f.tipo === "entrada" && (!cur.entrada || f.timestamp_real < cur.entrada)) cur.entrada = f.timestamp_real;
      if (f.tipo === "salida" && (!cur.salida || f.timestamp_real > cur.salida)) cur.salida = f.timestamp_real;
      porDia.set(key, cur);
    });
    const acc = new Map<string, { dias: number; horas: number; fechas: string[] }>();
    porDia.forEach((v, key) => {
      if (!v.entrada || !v.salida) return;
      const horas = (new Date(v.salida).getTime() - new Date(v.entrada).getTime()) / 3_600_000;
      if (horas <= 0 || horas > 20) return;
      const extras = redondearExtras(horas - 8);
      if (extras <= 0) return;
      const [empId, fecha] = key.split("|");
      const r = acc.get(empId) || { dias: 0, horas: 0, fechas: [] };
      r.dias += 1;
      r.horas += extras;
      r.fechas.push(formatArgentinaDate(`${fecha}T12:00:00`, "dd/MM"));
      acc.set(empId, r);
    });
    return acc;
  }, [filas, soloHabiles, contarFeriados, feriados]);

  // Vacaciones, licencias médicas y faltas justificadas del período (para el mínimo exigible)
  const [vacaciones, setVacaciones] = useState<{ empleado_id: string; fecha_inicio: string; fecha_fin: string }[]>([]);
  const [medicas, setMedicas] = useState<{ empleado_id: string; fecha_inicio: string; fecha_fin: string }[]>([]);
  const [justificaciones, setJustificaciones] = useState<{ empleado_id: string; fecha_evento: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [v, m, j] = await Promise.all([
        supabase
          .from("solicitudes_vacaciones")
          .select("empleado_id,fecha_inicio,fecha_fin,estado")
          .in("estado", ["aprobada", "pendiente", "gozadas"])
          .lte("fecha_inicio", hasta)
          .gte("fecha_fin", desde),
        supabase
          .from("ausencias_medicas")
          .select("empleado_id,fecha_inicio,fecha_fin")
          .lte("fecha_inicio", hasta)
          .gte("fecha_fin", desde),
        supabase
          .from("justificaciones_asistencia")
          .select("empleado_id,fecha_evento")
          .gte("fecha_evento", desde)
          .lte("fecha_evento", hasta),
      ]);
      setVacaciones((v.data as any[]) || []);
      setMedicas((m.data as any[]) || []);
      setJustificaciones((j.data as any[]) || []);
    })();
  }, [desde, hasta]);

  // Días hábiles ausentes justificados por empleado
  const ausenciasPorEmpleado = useMemo(() => {
    const feriadosSet = new Set(feriados.map((f) => f.fecha));
    const esHabilComputable = (fecha: string) => {
      const d = new Date(`${fecha}T12:00:00`);
      if (d.getDay() === 0) return false;
      if (!contarFeriados && feriadosSet.has(fecha)) return false;
      return true;
    };
    const acc = new Map<string, { vac: Set<string>; med: Set<string>; just: Set<string> }>();
    const get = (id: string) => {
      let r = acc.get(id);
      if (!r) {
        r = { vac: new Set(), med: new Set(), just: new Set() };
        acc.set(id, r);
      }
      return r;
    };
    const recorrer = (ini: string, fin: string, add: (f: string) => void) => {
      const start = ini < desde ? desde : ini;
      const end = fin > hasta ? hasta : fin;
      const cur = new Date(`${start}T12:00:00`);
      const last = new Date(`${end}T12:00:00`);
      while (cur <= last) {
        const f = format(cur, "yyyy-MM-dd");
        if (esHabilComputable(f)) add(f);
        cur.setDate(cur.getDate() + 1);
      }
    };
    vacaciones.forEach((v) => recorrer(v.fecha_inicio, v.fecha_fin, (f) => get(v.empleado_id).vac.add(f)));
    medicas.forEach((m) => recorrer(m.fecha_inicio, m.fecha_fin, (f) => get(m.empleado_id).med.add(f)));
    justificaciones.forEach((j) => {
      if (esHabilComputable(j.fecha_evento)) get(j.empleado_id).just.add(j.fecha_evento);
    });
    return acc;
  }, [vacaciones, medicas, justificaciones, feriados, contarFeriados, desde, hasta]);

  // Días trabajados por empleado y por kiosco (día = fecha con al menos un fichaje ahí)

  const resumenDias = useMemo<ResumenDias[]>(() => {
    const map = new Map<
      string,
      { id: string; empleado: string; legajo: string | null; sucursal_nombre: string | null; dias: Set<string>; porPunto: Map<string, Set<string>>; puntosPorDia: Map<string, Set<string>> }
    >();
    filasVista.forEach((f) => {
      const fecha = formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd");
      let r = map.get(f.empleado_id);
      if (!r) {
        r = {
          id: f.empleado_id,
          empleado: f.empleado,
          legajo: f.legajo,
          sucursal_nombre: f.sucursal_nombre,
          dias: new Set<string>(),
          porPunto: new Map<string, Set<string>>(),
          puntosPorDia: new Map<string, Set<string>>(),
        };
        map.set(f.empleado_id, r);
      }
      r.dias.add(fecha);
      const key = f.clasificacion;
      if (!r.porPunto.has(key)) r.porPunto.set(key, new Set<string>());
      r.porPunto.get(key)!.add(fecha);
      if (key !== SIN_GPS && key !== FUERA) {
        if (!r.puntosPorDia.has(fecha)) r.puntosPorDia.set(fecha, new Set<string>());
        r.puntosPorDia.get(fecha)!.add(key);
      }
    });
    const habiles = diasHabilesInfo.habilesNetos || 0;
    return Array.from(map.values())
      .map((r) => {
        const diasTrabajados = r.dias.size;
        const diasPorPunto: Record<string, number> = {};
        const pctPorPunto: Record<string, number> = {};
        const pctSobreHabiles: Record<string, number> = {};
        r.porPunto.forEach((set, k) => {
          diasPorPunto[k] = set.size;
          pctPorPunto[k] = diasTrabajados ? (set.size / diasTrabajados) * 100 : 0;
          pctSobreHabiles[k] = habiles ? (set.size / habiles) * 100 : 0;
        });
        const fechasMulti: string[] = [];
        r.puntosPorDia.forEach((set, fecha) => {
          if (set.size > 1) fechasMulti.push(formatArgentinaDate(`${fecha}T12:00:00`, "dd/MM"));
        });
        fechasMulti.sort();
        const ex = extrasPorEmpleado.get(r.id);
        const a = ausenciasPorEmpleado.get(r.id);
        const diasVacaciones = a?.vac.size || 0;
        const diasMedicas = a?.med.size || 0;
        const diasJustificados = Array.from(a?.just || []).filter(
          (f) => !a!.vac.has(f) && !a!.med.has(f),
        ).length;
        const diasEsperados = Math.max(0, habiles - diasVacaciones - diasMedicas - diasJustificados);
        const diasFaltantes = Math.max(0, diasEsperados - diasTrabajados);
        const aus = {
          diasVacaciones,
          diasMedicas,
          diasJustificados,
          diasEsperados,
          diasFaltantes,
          cumple: diasFaltantes === 0,
        };
        const notas: string[] = [];
        if (fechasMulti.length)
          notas.push(`Trabajó en 2 o más kioscos en ${fechasMulti.length} día(s): ${fechasMulti.join(", ")}`);
        if (ex) notas.push(`Superó la jornada de 8 h en ${ex.dias} día(s): +${ex.horas.toFixed(1)} hs extras`);
        if (diasVacaciones) notas.push(`${diasVacaciones} día(s) hábiles de vacaciones`);
        if (diasMedicas) notas.push(`${diasMedicas} día(s) de licencia médica`);
        if (diasJustificados) notas.push(`${diasJustificados} falta(s) justificada(s)`);
        if (diasFaltantes) notas.push(`Faltan ${diasFaltantes} día(s) hábiles sin justificar`);

        return {
          empleado: r.empleado,
          legajo: r.legajo,
          sucursal_nombre: r.sucursal_nombre,
          diasTrabajados,
          diasPorPunto,
          pctPorPunto,
          pctSobreHabiles,
          diasHabilesPeriodo: habiles,
          pctDiasHabiles: habiles ? (diasTrabajados / habiles) * 100 : 0,
          diasMultiKiosco: fechasMulti.length,
          fechasMultiKiosco: fechasMulti,
          diasConExtras: ex?.dias || 0,
          horasExtras: ex ? Number(ex.horas.toFixed(1)) : 0,
          ...aus,
          nota: notas.join(" · "),
        };
      })
      .sort((a, b) => a.empleado.localeCompare(b.empleado));
  }, [filasVista, diasHabilesInfo, extrasPorEmpleado, ausenciasPorEmpleado]);

  // ===== Filtros por columna del cuadro de días =====
  const [fKiosco, setFKiosco] = useState(TODAS);
  const [fCumplimiento, setFCumplimiento] = useState(TODAS);
  const [fSoloMulti, setFSoloMulti] = useState(false);
  const [fSoloExtras, setFSoloExtras] = useState(false);
  const [fBuscaDias, setFBuscaDias] = useState("");
  const [fMinPct, setFMinPct] = useState("");

  const resumenDiasFiltrado = useMemo(() => {
    const q = fBuscaDias.trim().toLowerCase();
    const minPct = fMinPct ? Number(fMinPct) : null;
    return resumenDias.filter((r) => {
      if (q && !`${r.empleado} ${r.legajo || ""}`.toLowerCase().includes(q)) return false;
      if (fKiosco !== TODAS && !r.diasPorPunto[fKiosco]) return false;
      if (fSoloMulti && !r.diasMultiKiosco) return false;
      if (fSoloExtras && !r.horasExtras) return false;
      if (fCumplimiento === "no_cumple" && (r.diasFaltantes || 0) <= 0) return false;
      if (fCumplimiento === "cumple" && (r.diasFaltantes || 0) > 0) return false;
      if (minPct != null && (r.pctDiasHabiles || 0) < minPct) return false;
      return true;
    });
  }, [resumenDias, fBuscaDias, fKiosco, fSoloMulti, fSoloExtras, fCumplimiento, fMinPct]);

  const columnasDias = useMemo(() => {
    const set = new Set<string>();
    resumenDias.forEach((r) => Object.keys(r.diasPorPunto).forEach((k) => set.add(k)));
    return Array.from(set).sort();
  }, [resumenDias]);


  const totales = useMemo(() => {
    const conGps = filasVista.filter((f) => f.latitud != null).length;
    return {
      total: filasVista.length,
      conGps,
      sinGps: filasVista.length - conGps,
      fuera: filasVista.filter((f) => f.clasificacion === FUERA).length,
    };
  }, [filasVista]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" /> Ubicaciones de fichaje
        </h1>
        <p className="text-muted-foreground">
          Desde dónde fichó cada empleado según el GPS, con el kiosco y el centro de costo asignado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Elegí el período y tildá los empleados que salen en el informe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>— Todas —</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SelectorGrupoCompacto
              value={seleccionGrupo}
              onChange={setSeleccionGrupo}
              modulo="fichero"
              empleados={empleados}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empleado…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleTodos(true)}>Seleccionar todos</Button>
              <Button variant="outline" size="sm" onClick={() => toggleTodos(false)}>Ninguno</Button>
              <Badge variant="secondary">{seleccionados.length} seleccionados</Badge>
            </div>
            <ScrollArea className="h-56 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {empleadosVisibles.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!checked[e.id]}
                      onCheckedChange={(v) => setChecked({ ...checked, [e.id]: !!v })}
                    />
                    <span>
                      {e.apellido} {e.nombre}
                      {e.legajo ? <span className="text-muted-foreground"> · {e.legajo}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={soloEntradaSalida} onCheckedChange={setSoloEntradaSalida} />
              Solo entradas y salidas (sin pausas)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={porJornada} onCheckedChange={setPorJornada} />
              Contar por jornada (1 unidad por día y kiosco)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={soloHabiles} onCheckedChange={setSoloHabiles} />
              Contar solo días hábiles (lunes a sábado, sin domingos)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={contarFeriados} onCheckedChange={setContarFeriados} />
              {contarFeriados ? "Los feriados se cuentan como día trabajado" : "Los feriados NO se cuentan"}
            </label>
          </div>


          <div className="flex flex-wrap gap-2">
            <Button onClick={cargar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Generar informe
            </Button>
            <Button
              variant="outline"
              disabled={!filasVista.length}
              onClick={() => exportUbicacionesXLSX(filasVista, resumen, puntosUsados, desde, hasta, resumenDiasFiltrado)}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button
              variant="outline"
              disabled={!filasVista.length}
              onClick={() => exportUbicacionesPDF(filasVista, resumen, puntosUsados, desde, hasta, resumenDiasFiltrado)}
            >
              <FileDown className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Días hábiles del período</CardTitle>
          <CardDescription>
            {desde} al {hasta} · se cuenta de lunes a sábado, los domingos no son días hábiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Días hábiles (L-S)</div>
              <div className="text-2xl font-bold">{diasHabilesInfo.habiles}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Domingos (no hábiles)</div>
              <div className="text-2xl font-bold">{diasHabilesInfo.domingos}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Feriados en día hábil</div>
              <div className="text-2xl font-bold">{diasHabilesInfo.feriadosHabiles.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Hábiles a computar</div>
              <div className="text-2xl font-bold">{diasHabilesInfo.habilesNetos}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {contarFeriados
              ? "Los feriados se cuentan como día hábil trabajado."
              : "Los feriados se descuentan de los días hábiles y se excluyen del informe."}
            {diasHabilesInfo.feriadosHabiles.length > 0 && (
              <span> Feriados: {diasHabilesInfo.feriadosHabiles.map((f) => `${f.fecha} ${f.nombre}`).join(" · ")}.</span>
            )}
          </p>
        </CardContent>
      </Card>


      {cargado && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fichajes</div><div className="text-2xl font-bold">{totales.total}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Con GPS</div><div className="text-2xl font-bold">{totales.conGps}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Sin GPS</div><div className="text-2xl font-bold">{totales.sinGps}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fuera de ubicación</div><div className="text-2xl font-bold">{totales.fuera}</div></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="detalle">
        <TabsList>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="dias">Días por kiosco</TabsTrigger>
          <TabsTrigger value="puntos">Puntos de fichaje</TabsTrigger>
        </TabsList>

        <TabsContent value="detalle">
          <Card>
            <CardContent className="pt-6">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Centro de costo</TableHead>
                      <TableHead className="text-right">Dist.</TableHead>
                      <TableHead>GPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasVista.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Generá el informe para ver los fichajes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filasVista.map((f) => (
                        <TableRow key={f.fichaje_id}>
                          <TableCell className="font-medium">{f.empleado}</TableCell>
                          <TableCell>{formatArgentinaDate(f.timestamp_real, "dd/MM/yyyy")}</TableCell>
                          <TableCell>{formatArgentinaTime(f.timestamp_real, "HH:mm")}</TableCell>
                          <TableCell>{f.tipo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs">
                              {f.metodo === "facial" ? <ScanFace className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                              {f.origen}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f.clasificacion === SIN_GPS
                                  ? "secondary"
                                  : f.clasificacion === FUERA
                                    ? "destructive"
                                    : "default"
                              }
                            >
                              {f.clasificacion}
                            </Badge>
                          </TableCell>
                          <TableCell>{f.centro_costo_nombre || "—"}</TableCell>
                          <TableCell className="text-right">
                            {f.distancia_metros != null ? `${Math.round(f.distancia_metros)} m` : "—"}
                          </TableCell>
                          <TableCell>
                            {f.latitud != null && f.longitud != null ? (
                              <a
                                href={`https://www.google.com/maps?q=${f.latitud},${f.longitud}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs hover:text-primary"
                              >
                                Ver <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumen">
          <Card>
            <CardContent className="pt-6">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {puntosUsados.map((p) => (
                        <TableHead key={p} className="text-right">{p}</TableHead>
                      ))}
                      <TableHead className="text-right">Fuera</TableHead>
                      <TableHead className="text-right">Sin GPS</TableHead>
                      <TableHead className="text-right">% fuera</TableHead>
                      <TableHead>Centros de costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumen.map((r) => (
                        <TableRow key={r.empleado}>
                          <TableCell className="font-medium">{r.empleado}</TableCell>
                          <TableCell>{r.sucursal_nombre || "—"}</TableCell>
                          <TableCell className="text-right">{r.total}</TableCell>
                          {puntosUsados.map((p) => (
                            <TableCell key={p} className="text-right">{r.porPunto[p] || 0}</TableCell>
                          ))}
                          <TableCell className="text-right">{r.fueraUbicacion}</TableCell>
                          <TableCell className="text-right">{r.sinGps}</TableCell>
                          <TableCell className="text-right">{r.pctFuera.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs">{r.centrosCosto || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dias">
          <Card>
            <CardHeader>
              <CardTitle>Días trabajados por kiosco</CardTitle>
              <CardDescription>
                Sobre {diasHabilesInfo.habilesNetos} días hábiles del período: días trabajados en cada kiosco y su
                porcentaje. Se indica si el empleado trabajó en 2 kioscos distintos el mismo día y si superó la jornada
                de 8 h (horas extras, la pausa ya está contemplada).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-5 rounded-md border p-3">
                <div>
                  <Label className="text-xs">Buscar empleado</Label>
                  <Input value={fBuscaDias} onChange={(e) => setFBuscaDias(e.target.value)} placeholder="Nombre o legajo" />
                </div>
                <div>
                  <Label className="text-xs">Kiosco</Label>
                  <Select value={fKiosco} onValueChange={setFKiosco}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS}>— Todos —</SelectItem>
                      {columnasDias.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Cumplimiento de días hábiles</Label>
                  <Select value={fCumplimiento} onValueChange={setFCumplimiento}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODAS}>— Todos —</SelectItem>
                      <SelectItem value="no_cumple">No cumplió el mínimo</SelectItem>
                      <SelectItem value="cumple">Cumplió el mínimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">% mínimo s/ hábiles</Label>
                  <Input type="number" min={0} max={100} value={fMinPct} onChange={(e) => setFMinPct(e.target.value)} placeholder="ej. 80" />
                </div>
                <div className="flex flex-col justify-end gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <Switch checked={fSoloMulti} onCheckedChange={setFSoloMulti} /> Solo con 2 kioscos
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch checked={fSoloExtras} onCheckedChange={setFSoloExtras} /> Solo con horas extras
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{resumenDiasFiltrado.length} empleados</Badge>
                <span>
                  Mínimo exigible = días hábiles ({diasHabilesInfo.habilesNetos}) − vacaciones − licencias médicas −
                  faltas justificadas.
                </span>
              </div>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Días trabajados</TableHead>
                      <TableHead className="text-right">% s/ hábiles</TableHead>
                      {columnasDias.map((p) => (
                        <TableHead key={p} className="text-right">{p}</TableHead>
                      ))}
                      <TableHead className="text-right">Vac.</TableHead>
                      <TableHead className="text-right">Lic. méd.</TableHead>
                      <TableHead className="text-right">Justif.</TableHead>
                      <TableHead className="text-right">Mín. exigible</TableHead>
                      <TableHead className="text-right">Faltantes</TableHead>
                      <TableHead className="text-right">2 kioscos</TableHead>
                      <TableHead className="text-right">Hs extras</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumenDiasFiltrado.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11 + columnasDias.length} className="text-center text-muted-foreground">
                          Sin resultados con los filtros actuales
                        </TableCell>
                      </TableRow>
                    ) : (
                      resumenDiasFiltrado.map((r) => (
                        <TableRow key={r.empleado} className={r.cumple ? undefined : "bg-destructive/5"}>
                          <TableCell className="font-medium">{r.empleado}</TableCell>
                          <TableCell>{r.sucursal_nombre || "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{r.diasTrabajados}</TableCell>
                          <TableCell className="text-right">{(r.pctDiasHabiles || 0).toFixed(0)}%</TableCell>

                          {columnasDias.map((p) => (
                            <TableCell key={p} className="text-right">
                              {r.diasPorPunto[p] ? (
                                <span>
                                  {r.diasPorPunto[p]}{" "}
                                  <span className="text-muted-foreground text-xs">
                                    ({(r.pctSobreHabiles?.[p] ?? r.pctPorPunto[p]).toFixed(0)}%)
                                  </span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">{r.diasVacaciones || "—"}</TableCell>
                          <TableCell className="text-right">{r.diasMedicas || "—"}</TableCell>
                          <TableCell className="text-right">{r.diasJustificados || "—"}</TableCell>
                          <TableCell className="text-right font-medium">{r.diasEsperados ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {r.diasFaltantes ? (
                              <Badge variant="destructive">{r.diasFaltantes}</Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.diasMultiKiosco ? (
                              <Badge variant="secondary" title={(r.fechasMultiKiosco || []).join(", ")}>

                                {r.diasMultiKiosco} día(s)
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.horasExtras ? (
                              <Badge variant="destructive">+{r.horasExtras.toFixed(1)} h</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs max-w-[280px]">{r.nota || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}

                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="puntos">
          <PuntosFichajeManager onChanged={() => cargado && cargar()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
