import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_HOUR_START = 7;
const DEFAULT_HOUR_END = 23; // exclusive
const STORAGE_KEY = "dashboard:cobertura:prefs:v1";

type Prefs = {
  hidden: string[];
  hourStart: number;
  hourEnd: number;
  fuentes: { excepcion: boolean; planif: boolean; habitual: boolean };
};

const DEFAULT_PREFS: Prefs = {
  hidden: [],
  hourStart: DEFAULT_HOUR_START,
  hourEnd: DEFAULT_HOUR_END,
  fuentes: { excepcion: true, planif: true, habitual: true },
};

type Sucursal = { id: string; nombre: string };
type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  sucursal_id: string | null;
  activo: boolean;
};
type Turno = {
  id: string;
  hora_entrada: string;
  hora_salida: string;
  sucursal_id: string | null;
  dias_semana: number[] | null;
};
type EmpTurno = {
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  turno: Turno | null;
};
type PlanifDet = {
  empleado_id: string;
  sucursal_id: string;
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
};
type Especial = {
  empleado_id: string;
  sucursal_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
};

type CoberturaEmpleado = {
  empleado: Empleado;
  sucursal_id: string;
  hora_entrada: string;
  hora_salida: string;
  fuente: "Excepción" | "Planificación" | "Turno habitual";
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function getCellCount(cobs: CoberturaEmpleado[], hour: number): CoberturaEmpleado[] {
  const startM = hour * 60;
  const endM = startM + 60;
  return cobs.filter((c) => {
    const s = timeToMinutes(c.hora_entrada);
    let e = timeToMinutes(c.hora_salida);
    if (e <= s) e += 24 * 60; // overnight
    return s < endM && e > startM;
  });
}

function colorForCount(n: number, max: number): string {
  if (n === 0) return "bg-muted/40";
  const ratio = max > 0 ? n / max : 0;
  if (ratio > 0.75) return "bg-emerald-500/80 text-white";
  if (ratio > 0.5) return "bg-emerald-400/70 text-white";
  if (ratio > 0.25) return "bg-emerald-300/70";
  return "bg-emerald-200/70";
}

function getWeekStartISO(d: Date): string {
  // ISO week: Monday
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(d, diff);
  return format(monday, "yyyy-MM-dd");
}

export function CoberturaSucursales() {
  const [fecha, setFecha] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [coberturas, setCoberturas] = useState<CoberturaEmpleado[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_PREFS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  const HOURS = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, prefs.hourEnd - prefs.hourStart) },
        (_, i) => prefs.hourStart + i
      ),
    [prefs.hourStart, prefs.hourEnd]
  );

  const toggleHidden = (id: string) =>
    setPrefs((p) => ({
      ...p,
      hidden: p.hidden.includes(id)
        ? p.hidden.filter((x) => x !== id)
        : [...p.hidden, id],
    }));

  const fechaStr = format(fecha, "yyyy-MM-dd");
  const diaSemana = fecha.getDay();

  const fetchData = async () => {
    setLoading(true);
    try {
      const semanaInicio = getWeekStartISO(fecha);

      const [sucRes, empRes, etRes, planRes, espRes] = await Promise.all([
        supabase
          .from("sucursales")
          .select("id, nombre")
          .eq("activa", true)
          .order("nombre"),
        supabase
          .from("empleados")
          .select("id, nombre, apellido, sucursal_id, activo")
          .eq("activo", true),
        supabase
          .from("empleado_turnos")
          .select(
            "empleado_id, fecha_inicio, fecha_fin, activo, turno:fichado_turnos(id, hora_entrada, hora_salida, sucursal_id, dias_semana)"
          )
          .eq("activo", true)
          .lte("fecha_inicio", fechaStr)
          .or(`fecha_fin.is.null,fecha_fin.gte.${fechaStr}`),
        supabase
          .from("planificacion_semanal")
          .select("id, fecha_inicio_semana, estado")
          .eq("fecha_inicio_semana", semanaInicio)
          .maybeSingle(),
        supabase
          .from("asignaciones_especiales")
          .select("empleado_id, sucursal_id, fecha, hora_entrada, hora_salida")
          .eq("fecha", fechaStr),
      ]);

      const sucs = (sucRes.data || []) as Sucursal[];
      const empleados = (empRes.data || []) as Empleado[];
      const empMap = new Map(empleados.map((e) => [e.id, e]));
      const turnos = (etRes.data || []) as unknown as EmpTurno[];
      const especiales = (espRes.data || []) as Especial[];

      let detalles: PlanifDet[] = [];
      if (planRes.data?.id) {
        const { data: det } = await supabase
          .from("planificacion_semanal_detalle")
          .select("empleado_id, sucursal_id, dia_semana, hora_entrada, hora_salida")
          .eq("planificacion_id", planRes.data.id)
          .eq("dia_semana", diaSemana);
        detalles = (det || []) as PlanifDet[];
      }

      const byEmp = new Map<string, CoberturaEmpleado>();

      // 1. Turno habitual (lowest priority)
      turnos.forEach((t) => {
        const emp = empMap.get(t.empleado_id);
        if (!emp || !t.turno) return;
        const dias = t.turno.dias_semana || [];
        if (dias.length > 0 && !dias.includes(diaSemana)) return;
        byEmp.set(t.empleado_id, {
          empleado: emp,
          sucursal_id: t.turno.sucursal_id || emp.sucursal_id || "sin",
          hora_entrada: t.turno.hora_entrada,
          hora_salida: t.turno.hora_salida,
          fuente: "Turno habitual",
        });
      });

      // 2. Planificación semanal (override)
      detalles.forEach((d) => {
        const emp = empMap.get(d.empleado_id);
        if (!emp) return;
        byEmp.set(d.empleado_id, {
          empleado: emp,
          sucursal_id: d.sucursal_id || emp.sucursal_id || "sin",
          hora_entrada: d.hora_entrada,
          hora_salida: d.hora_salida,
          fuente: "Planificación",
        });
      });

      // 3. Asignaciones especiales (highest)
      especiales.forEach((e) => {
        const emp = empMap.get(e.empleado_id);
        if (!emp) return;
        byEmp.set(e.empleado_id, {
          empleado: emp,
          sucursal_id: e.sucursal_id || emp.sucursal_id || "sin",
          hora_entrada: e.hora_entrada,
          hora_salida: e.hora_salida,
          fuente: "Excepción",
        });
      });

      setSucursales(sucs);
      setCoberturas(Array.from(byEmp.values()));
    } catch (err) {
      console.error("Error cargando cobertura:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaStr]);

  const coberturasFiltradas = useMemo(
    () =>
      coberturas.filter((c) => {
        if (c.fuente === "Excepción" && !prefs.fuentes.excepcion) return false;
        if (c.fuente === "Planificación" && !prefs.fuentes.planif) return false;
        if (c.fuente === "Turno habitual" && !prefs.fuentes.habitual) return false;
        return true;
      }),
    [coberturas, prefs.fuentes]
  );

  const porSucursal = useMemo(() => {
    const map = new Map<string, CoberturaEmpleado[]>();
    sucursales.forEach((s) => map.set(s.id, []));
    coberturasFiltradas.forEach((c) => {
      const arr = map.get(c.sucursal_id);
      if (arr) arr.push(c);
    });
    return map;
  }, [sucursales, coberturasFiltradas]);

  const sucursalesVisibles = useMemo(
    () => sucursales.filter((s) => !prefs.hidden.includes(s.id)),
    [sucursales, prefs.hidden]
  );

  const maxPorSucursal = useMemo(() => {
    const m = new Map<string, number>();
    porSucursal.forEach((cobs, sucId) => {
      let max = 0;
      HOURS.forEach((h) => {
        const n = getCellCount(cobs, h).length;
        if (n > max) max = n;
      });
      m.set(sucId, max);
    });
    return m;
  }, [porSucursal]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Cobertura por sucursal
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {(prefs.hidden.length > 0 ||
                  !prefs.fuentes.excepcion ||
                  !prefs.fuentes.planif ||
                  !prefs.fuentes.habitual ||
                  prefs.hourStart !== DEFAULT_HOUR_START ||
                  prefs.hourEnd !== DEFAULT_HOUR_END) && (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    on
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Rango horario
                  </Label>
                  <div className="flex items-center justify-between text-xs mt-2 mb-1">
                    <span>{String(prefs.hourStart).padStart(2, "0")}:00</span>
                    <span>{String(prefs.hourEnd).padStart(2, "0")}:00</span>
                  </div>
                  <Slider
                    value={[prefs.hourStart, prefs.hourEnd]}
                    min={0}
                    max={24}
                    step={1}
                    minStepsBetweenThumbs={1}
                    onValueChange={(v) =>
                      setPrefs((p) => ({ ...p, hourStart: v[0], hourEnd: v[1] }))
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Fuente de horario
                  </Label>
                  <div className="space-y-2 mt-2">
                    {(
                      [
                        ["excepcion", "Excepciones del día"],
                        ["planif", "Planificación semanal"],
                        ["habitual", "Turno habitual"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={prefs.fuentes[key]}
                          onCheckedChange={(v) =>
                            setPrefs((p) => ({
                              ...p,
                              fuentes: { ...p.fuentes, [key]: !!v },
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Sucursales
                    </Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setPrefs((p) => ({ ...p, hidden: [] }))}
                      >
                        Mostrar todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          setPrefs((p) => ({
                            ...p,
                            hidden: sucursales.map((s) => s.id),
                          }))
                        }
                      >
                        Ocultar todas
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    {sucursales.map((s) => {
                      const visible = !prefs.hidden.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleHidden(s.id)}
                          className="w-full flex items-center justify-between gap-2 text-sm px-2 py-1.5 rounded hover:bg-accent"
                        >
                          <span className="truncate">{s.nombre}</span>
                          {visible ? (
                            <Eye className="h-4 w-4 text-primary" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setPrefs(DEFAULT_PREFS)}
                >
                  Restablecer filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setFecha((d) => addDays(d, -1))}
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFecha(new Date())}>
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFecha((d) => addDays(d, 1))}
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData} aria-label="Refrescar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-separate border-spacing-0 min-w-[800px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-card text-left font-medium text-muted-foreground p-2 w-48 z-10">
                      Sucursal
                    </th>
                    {HOURS.map((h) => (
                      <th
                        key={h}
                        className="text-center font-medium text-muted-foreground p-1"
                      >
                        {String(h).padStart(2, "0")}
                      </th>
                    ))}
                    <th className="text-center font-medium text-muted-foreground p-2 w-16">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sucursales.map((s) => {
                    const cobs = porSucursal.get(s.id) || [];
                    const max = maxPorSucursal.get(s.id) || 0;
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="sticky left-0 bg-card p-2 z-10">
                          <div className="font-medium truncate">{s.nombre}</div>
                          <div className="text-muted-foreground text-[10px]">
                            Máx {max} simultáneos
                          </div>
                        </td>
                        {HOURS.map((h) => {
                          const here = getCellCount(cobs, h);
                          const n = here.length;
                          return (
                            <td key={h} className="p-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`h-9 rounded flex items-center justify-center text-[11px] font-semibold cursor-default ${colorForCount(
                                      n,
                                      max
                                    )}`}
                                  >
                                    {n > 0 ? n : ""}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="text-xs font-semibold mb-1">
                                    {String(h).padStart(2, "0")}:00 — {n}{" "}
                                    {n === 1 ? "empleado" : "empleados"}
                                  </div>
                                  {here.length === 0 ? (
                                    <div className="text-muted-foreground">
                                      Sin cobertura
                                    </div>
                                  ) : (
                                    <ul className="space-y-0.5">
                                      {here.slice(0, 8).map((c) => (
                                        <li key={c.empleado.id}>
                                          {c.empleado.nombre} {c.empleado.apellido}{" "}
                                          <span className="text-muted-foreground">
                                            ({c.hora_entrada.slice(0, 5)}–
                                            {c.hora_salida.slice(0, 5)})
                                          </span>
                                        </li>
                                      ))}
                                      {here.length > 8 && (
                                        <li className="text-muted-foreground">
                                          +{here.length - 8} más…
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                        <td className="text-center p-2">
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {cobs.length}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {sucursales.length === 0 && (
                    <tr>
                      <td
                        colSpan={HOURS.length + 2}
                        className="text-center text-muted-foreground p-6"
                      >
                        Sin sucursales activas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3 flex-wrap">
          <span>Escala:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-muted/40 border" /> 0
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-200/70" /> bajo
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-300/70" /> medio
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-400/70" /> alto
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-500/80" /> máximo
          </span>
          <span className="ml-auto">
            Combina planificación semanal + turno habitual + excepciones del día.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
