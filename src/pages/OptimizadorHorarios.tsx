import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wand2,
  Download,
  RotateCcw,
  ArrowRight,
  Undo2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ---------- Types ----------
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
type EmpTurnoRow = {
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  turno: Turno | null;
};

type Asignacion = {
  empleado_id: string;
  empleado_nombre: string;
  sucursal_id: string;
  hora_entrada: string; // HH:MM
  hora_salida: string; // HH:MM
  duracion_min: number;
  origen: "Turno" | "Excepción" | "Planificación";
};

// ---------- Utils ----------
const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i); // 07..22

const timeToMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const minToTime = (m: number): string => {
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60);
  const mi = mm % 60;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
};

function coversHour(entradaMin: number, duracionMin: number, hour: number) {
  const startM = hour * 60;
  const endM = startM + 60;
  let s = entradaMin;
  let e = entradaMin + duracionMin;
  if (e <= s) e += 1440;
  return s < endM && e > startM;
}

function heatColor(n: number, target: number): string {
  if (n === 0) return "bg-muted/40 text-muted-foreground";
  if (target === 0) return "bg-emerald-300/60 text-foreground";
  const ratio = n / target;
  if (ratio < 0.5) return "bg-red-400/70 text-white"; // fuerte déficit
  if (ratio < 1) return "bg-amber-300/80 text-foreground"; // déficit
  if (ratio === 1) return "bg-emerald-400/80 text-white"; // óptimo
  if (ratio <= 1.5) return "bg-emerald-500/85 text-white";
  return "bg-sky-500/85 text-white"; // sobrecobertura
}

function getWeekStartISO(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(d, diff);
  return format(monday, "yyyy-MM-dd");
}

// ---------- Page ----------
export default function OptimizadorHorarios() {
  const [fecha, setFecha] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [asignacionesBase, setAsignacionesBase] = useState<Asignacion[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("all");
  const [targets, setTargets] = useState<Record<string, number>>({}); // por sucursal, objetivo min de empleados por hora
  const [targetsHora, setTargetsHora] = useState<Record<string, Record<number, number>>>({}); // override por sucursal+hora
  const [empSel, setEmpSel] = useState<string | null>(null);
  const [franjaDraft, setFranjaDraft] = useState<Record<string, { desde: number; hasta: number; min: number }>>({});

  const getTarget = (sucId: string, hour: number) => {
    const override = targetsHora[sucId]?.[hour];
    if (override != null) return override;
    return targets[sucId] ?? 1;
  };

  const aplicarFranja = (sucId: string) => {
    const d = franjaDraft[sucId];
    if (!d) return;
    const { desde, hasta, min } = d;
    const lo = Math.min(desde, hasta);
    const hi = Math.max(desde, hasta);
    setTargetsHora((prev) => {
      const next = { ...prev, [sucId]: { ...(prev[sucId] || {}) } };
      for (let h = lo; h <= hi; h++) next[sucId][h] = min;
      return next;
    });
    toast({ title: "Franja aplicada", description: `${String(lo).padStart(2, "0")}:00–${String(hi).padStart(2, "0")}:59 → mín. ${min}` });
  };

  const limpiarFranjas = (sucId: string) => {
    setTargetsHora((prev) => {
      const next = { ...prev };
      delete next[sucId];
      return next;
    });
  };

  const fechaStr = format(fecha, "yyyy-MM-dd");
  const diaSemana = fecha.getDay();

  // ---- Load ----
  const fetchData = async () => {
    setLoading(true);
    try {
      const semanaInicio = getWeekStartISO(fecha);
      const [sucRes, empRes, etRes, planRes, espRes] = await Promise.all([
        supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("empleados").select("id, nombre, apellido, sucursal_id, activo").eq("activo", true),
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
          .select("id, fecha_inicio_semana")
          .eq("fecha_inicio_semana", semanaInicio)
          .maybeSingle(),
        supabase
          .from("asignaciones_especiales")
          .select("empleado_id, sucursal_id, fecha, hora_entrada, hora_salida")
          .eq("fecha", fechaStr),
      ]);

      const sucs = ((sucRes.data as Sucursal[]) || []).filter(
        (s) => !["administración", "ventas"].includes(s.nombre.toLowerCase())
      );
      const empleados = (empRes.data as Empleado[]) || [];
      const empMap = new Map(empleados.map((e) => [e.id, e]));
      const turnos = (etRes.data as unknown as EmpTurnoRow[]) || [];
      const especiales = (espRes.data as any[]) || [];

      let detalles: any[] = [];
      if (planRes.data?.id) {
        const { data: det } = await supabase
          .from("planificacion_semanal_detalle")
          .select("empleado_id, sucursal_id, dia_semana, hora_entrada, hora_salida")
          .eq("planificacion_id", planRes.data.id)
          .eq("dia_semana", diaSemana);
        detalles = det || [];
      }

      const byEmp = new Map<string, Asignacion>();

      turnos.forEach((t) => {
        const emp = empMap.get(t.empleado_id);
        if (!emp || !t.turno) return;
        const dias = t.turno.dias_semana || [];
        if (dias.length > 0 && !dias.includes(diaSemana)) return;
        const eIn = t.turno.hora_entrada.slice(0, 5);
        const eOut = t.turno.hora_salida.slice(0, 5);
        let dur = timeToMin(eOut) - timeToMin(eIn);
        if (dur <= 0) dur += 1440;
        byEmp.set(t.empleado_id, {
          empleado_id: emp.id,
          empleado_nombre: `${emp.apellido}, ${emp.nombre}`,
          sucursal_id: t.turno.sucursal_id || emp.sucursal_id || "sin",
          hora_entrada: eIn,
          hora_salida: eOut,
          duracion_min: dur,
          origen: "Turno",
        });
      });

      detalles.forEach((d) => {
        const emp = empMap.get(d.empleado_id);
        if (!emp) return;
        const eIn = d.hora_entrada.slice(0, 5);
        const eOut = d.hora_salida.slice(0, 5);
        let dur = timeToMin(eOut) - timeToMin(eIn);
        if (dur <= 0) dur += 1440;
        byEmp.set(d.empleado_id, {
          empleado_id: emp.id,
          empleado_nombre: `${emp.apellido}, ${emp.nombre}`,
          sucursal_id: d.sucursal_id || emp.sucursal_id || "sin",
          hora_entrada: eIn,
          hora_salida: eOut,
          duracion_min: dur,
          origen: "Planificación",
        });
      });

      especiales.forEach((e) => {
        const emp = empMap.get(e.empleado_id);
        if (!emp) return;
        const eIn = e.hora_entrada.slice(0, 5);
        const eOut = e.hora_salida.slice(0, 5);
        let dur = timeToMin(eOut) - timeToMin(eIn);
        if (dur <= 0) dur += 1440;
        byEmp.set(e.empleado_id, {
          empleado_id: emp.id,
          empleado_nombre: `${emp.apellido}, ${emp.nombre}`,
          sucursal_id: e.sucursal_id || emp.sucursal_id || "sin",
          hora_entrada: eIn,
          hora_salida: eOut,
          duracion_min: dur,
          origen: "Excepción",
        });
      });

      const arr = Array.from(byEmp.values()).filter((a) =>
        sucs.some((s) => s.id === a.sucursal_id)
      );
      setSucursales(sucs);
      setAsignacionesBase(arr);
      setAsignaciones(arr);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo cargar la información", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaStr]);

  // ---- Aggregation ----
  const sucursalesVisibles = useMemo(
    () => (sucursalFiltro === "all" ? sucursales : sucursales.filter((s) => s.id === sucursalFiltro)),
    [sucursales, sucursalFiltro]
  );

  const conteoBasePorSuc = useMemo(() => {
    const m = new Map<string, number[]>();
    sucursales.forEach((s) => m.set(s.id, HOURS.map(() => 0)));
    asignacionesBase.forEach((a) => {
      const eMin = timeToMin(a.hora_entrada);
      HOURS.forEach((h, i) => {
        if (coversHour(eMin, a.duracion_min, h)) {
          const arr = m.get(a.sucursal_id);
          if (arr) arr[i] += 1;
        }
      });
    });
    return m;
  }, [asignacionesBase, sucursales]);

  const conteoPropPorSuc = useMemo(() => {
    const m = new Map<string, number[]>();
    sucursales.forEach((s) => m.set(s.id, HOURS.map(() => 0)));
    asignaciones.forEach((a) => {
      const eMin = timeToMin(a.hora_entrada);
      HOURS.forEach((h, i) => {
        if (coversHour(eMin, a.duracion_min, h)) {
          const arr = m.get(a.sucursal_id);
          if (arr) arr[i] += 1;
        }
      });
    });
    return m;
  }, [asignaciones, sucursales]);

  // Targets iniciales = promedio redondeado de las horas de operación (con >0)
  useEffect(() => {
    if (!sucursales.length) return;
    setTargets((prev) => {
      const next = { ...prev };
      sucursales.forEach((s) => {
        if (next[s.id] == null) {
          const arr = conteoBasePorSuc.get(s.id) || [];
          const conCob = arr.filter((n) => n > 0);
          const avg = conCob.length ? conCob.reduce((x, y) => x + y, 0) / conCob.length : 1;
          next[s.id] = Math.max(1, Math.round(avg));
        }
      });
      return next;
    });
  }, [sucursales, conteoBasePorSuc]);

  // ---- Actions ----
  const shiftEmpleado = (empId: string, deltaMin: number) => {
    setAsignaciones((prev) =>
      prev.map((a) => {
        if (a.empleado_id !== empId) return a;
        const newIn = timeToMin(a.hora_entrada) + deltaMin;
        const newOut = newIn + a.duracion_min;
        return { ...a, hora_entrada: minToTime(newIn), hora_salida: minToTime(newOut) };
      })
    );
  };

  const setEntradaEmpleado = (empId: string, hhmm: string) => {
    setAsignaciones((prev) =>
      prev.map((a) => {
        if (a.empleado_id !== empId) return a;
        const inM = timeToMin(hhmm);
        return { ...a, hora_entrada: hhmm, hora_salida: minToTime(inM + a.duracion_min) };
      })
    );
  };

  const resetPropuesta = () => setAsignaciones(asignacionesBase);

  const cambios = useMemo(() => {
    const base = new Map(asignacionesBase.map((a) => [a.empleado_id, a]));
    return asignaciones.filter((a) => {
      const b = base.get(a.empleado_id);
      return b && b.hora_entrada !== a.hora_entrada;
    });
  }, [asignaciones, asignacionesBase]);

  // ---- Sugerencias automáticas ----
  const sugerencias = useMemo(() => {
    const out: { sucursal: string; sucursal_id: string; hora: number; deficit: number; candidatos: { empleado_id: string; nombre: string; from: string; to: string }[] }[] = [];
    sucursalesVisibles.forEach((s) => {
      const conteo = conteoPropPorSuc.get(s.id) || [];
      HOURS.forEach((h, i) => {
        const target = getTarget(s.id, h);
        const n = conteo[i] || 0;
        if (n < target) {
          const deficit = target - n;
          // buscar empleados de la misma sucursal cuya entrada actual esté "cerca" (±3h) y cuyo turno actual no cubra h
          const candidatos = asignaciones
            .filter((a) => a.sucursal_id === s.id)
            .filter((a) => !coversHour(timeToMin(a.hora_entrada), a.duracion_min, h))
            .map((a) => {
              const newIn = Math.max(0, h * 60 - Math.floor(a.duracion_min / 4));
              return {
                empleado_id: a.empleado_id,
                nombre: a.empleado_nombre,
                from: a.hora_entrada,
                to: minToTime(newIn),
              };
            })
            .filter((c) => {
              // sólo si el traslado <= 180 min
              return Math.abs(timeToMin(c.to) - timeToMin(c.from)) <= 180;
            })
            .slice(0, 3);
          if (candidatos.length > 0) {
            out.push({ sucursal: s.nombre, sucursal_id: s.id, hora: h, deficit, candidatos });
          }
        }
      });
    });
    return out.slice(0, 12);
  }, [sucursalesVisibles, targets, conteoPropPorSuc, asignaciones]);

  // ---- Export propuesta ----
  const exportarPropuesta = () => {
    const rows = [
      ["Fecha", "Sucursal", "Empleado", "Origen", "Entrada actual", "Salida actual", "Entrada propuesta", "Salida propuesta", "Δ minutos"],
    ];
    const base = new Map(asignacionesBase.map((a) => [a.empleado_id, a]));
    asignaciones.forEach((a) => {
      const b = base.get(a.empleado_id);
      const sName = sucursales.find((s) => s.id === a.sucursal_id)?.nombre || "";
      const delta = b ? timeToMin(a.hora_entrada) - timeToMin(b.hora_entrada) : 0;
      if (b && delta === 0) return;
      rows.push([
        fechaStr,
        sName,
        a.empleado_nombre,
        a.origen,
        b?.hora_entrada || "",
        b?.hora_salida || "",
        a.hora_entrada,
        a.hora_salida,
        String(delta),
      ]);
    });
    if (rows.length === 1) {
      toast({ title: "Sin cambios", description: "No hay movimientos para exportar." });
      return;
    }
    const csv = rows.map((r) => r.map((c) => `"${(c || "").split('"').join('""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `propuesta_horarios_${fechaStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Render ----
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Optimizador de horarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulá movimientos de turnos y equilibrá la cobertura por sucursal. Los cambios son <strong>propuestas</strong> — no se aplican al sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setFecha((d) => addDays(d, -1))} aria-label="Día anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setFecha(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => setFecha((d) => addDays(d, 1))} aria-label="Día siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData} aria-label="Refrescar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Sucursal</Label>
          <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las físicas</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground capitalize">
          {format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={resetPropuesta} disabled={cambios.length === 0}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restablecer
          </Button>
          <Button onClick={exportarPropuesta} disabled={cambios.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar propuesta ({cambios.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          {/* HEATMAPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                Mapa de calor — Base vs. Propuesta
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Verde óptimo (=objetivo), ámbar déficit, rojo déficit fuerte, azul sobre-cobertura. Ajustá el objetivo por sucursal en la columna derecha.
              </p>
            </CardHeader>
            <CardContent>
              <TooltipProvider delayDuration={150}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-0 min-w-[900px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-card text-left p-2 w-56 z-10">Sucursal / Vista</th>
                        {HOURS.map((h) => (
                          <th key={h} className="text-center p-1 font-medium text-muted-foreground">
                            {String(h).padStart(2, "0")}
                          </th>
                        ))}
                        <th className="text-center p-2 w-24">Objetivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sucursalesVisibles.map((s) => {
                        const base = conteoBasePorSuc.get(s.id) || [];
                        const prop = conteoPropPorSuc.get(s.id) || [];
                        const targetGen = targets[s.id] ?? 1;
                        const overrides = targetsHora[s.id] || {};
                        const draft = franjaDraft[s.id] || { desde: 14, hasta: 22, min: 3 };
                        return (
                          <>
                            <tr key={s.id + "-base"} className="border-t">
                              <td className="sticky left-0 bg-card p-2 z-10" rowSpan={3}>
                                <div className="font-medium">{s.nombre}</div>
                                <div className="text-[10px] text-muted-foreground">Base / Propuesta / Objetivo</div>
                              </td>
                              {HOURS.map((h, i) => {
                                const t = getTarget(s.id, h);
                                return (
                                  <td key={h} className="p-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={`h-7 rounded flex items-center justify-center text-[11px] font-semibold ${heatColor(base[i] || 0, t)}`}>
                                          {base[i] || ""}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>Base {String(h).padStart(2, "0")}:00 → {base[i] || 0} vs objetivo {t}</TooltipContent>
                                    </Tooltip>
                                  </td>
                                );
                              })}
                              <td rowSpan={3} className="p-2 align-top">
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 w-16"
                                    value={targetGen}
                                    onChange={(e) =>
                                      setTargets((p) => ({ ...p, [s.id]: Math.max(0, Number(e.target.value) || 0) }))
                                    }
                                  />
                                  <div className="text-[9px] text-muted-foreground">general</div>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              {HOURS.map((h, i) => {
                                const t = getTarget(s.id, h);
                                const n = prop[i] || 0;
                                const b = base[i] || 0;
                                const diff = n - b;
                                return (
                                  <td key={h} className="p-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={`h-7 rounded flex items-center justify-center text-[11px] font-semibold ${heatColor(n, t)} ${diff !== 0 ? "ring-2 ring-primary/60" : ""}`}>
                                          {n || ""}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Propuesta {String(h).padStart(2, "0")}:00 → {n} vs objetivo {t}
                                        {diff !== 0 && (
                                          <div className="text-[10px] text-primary">Cambio: {diff > 0 ? "+" : ""}{diff}</div>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr className="border-b">
                              {HOURS.map((h) => {
                                const ov = overrides[h];
                                return (
                                  <td key={h} className="p-0.5">
                                    <div className={`h-6 rounded text-[10px] flex items-center justify-center border ${ov != null ? "bg-primary/10 border-primary/40 text-primary font-semibold" : "bg-muted/30 text-muted-foreground border-transparent"}`}>
                                      {ov != null ? ov : targetGen}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              <td colSpan={HOURS.length + 2} className="p-2 bg-muted/20">
                                <div className="flex flex-wrap items-end gap-2 text-xs">
                                  <span className="text-muted-foreground">Mínimo por franja en <strong>{s.nombre}</strong>:</span>
                                  <div>
                                    <Label className="text-[10px]">Desde</Label>
                                    <Input
                                      type="number" min={7} max={22}
                                      className="h-7 w-16"
                                      value={draft.desde}
                                      onChange={(e) => setFranjaDraft((p) => ({ ...p, [s.id]: { ...draft, desde: Number(e.target.value) } }))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Hasta</Label>
                                    <Input
                                      type="number" min={7} max={22}
                                      className="h-7 w-16"
                                      value={draft.hasta}
                                      onChange={(e) => setFranjaDraft((p) => ({ ...p, [s.id]: { ...draft, hasta: Number(e.target.value) } }))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Mínimo</Label>
                                    <Input
                                      type="number" min={0}
                                      className="h-7 w-16"
                                      value={draft.min}
                                      onChange={(e) => setFranjaDraft((p) => ({ ...p, [s.id]: { ...draft, min: Number(e.target.value) } }))}
                                    />
                                  </div>
                                  <Button size="sm" variant="outline" className="h-7" onClick={() => aplicarFranja(s.id)}>
                                    Aplicar franja
                                  </Button>
                                  {Object.keys(overrides).length > 0 && (
                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => limpiarFranjas(s.id)}>
                                      Limpiar overrides
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TooltipProvider>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3 flex-wrap">
                <span>Escala vs. objetivo:</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400/70" /> déficit fuerte</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-300/80" /> déficit</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-400/80" /> óptimo</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-sky-500/85" /> sobre-cobertura</span>
              </div>
            </CardContent>
          </Card>

          {/* SUGERENCIAS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Sugerencias automáticas ({sugerencias.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Horarios con déficit vs. objetivo y candidatos cercanos (±3h) para mover.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {sugerencias.length === 0 ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Cobertura equilibrada según objetivos actuales.
                </div>
              ) : (
                sugerencias.map((sug, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive">Déficit {sug.deficit}</Badge>
                      <span className="font-medium">{sug.sucursal}</span>
                      <span className="text-muted-foreground text-xs">a las {String(sug.hora).padStart(2, "0")}:00</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sug.candidatos.map((c) => (
                        <Button
                          key={c.empleado_id}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setEntradaEmpleado(c.empleado_id, c.to)}
                        >
                          {c.nombre} <ArrowRight className="h-3 w-3 mx-1" /> {c.from} → {c.to}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* EMPLEADOS + edición */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Empleados asignados ({asignaciones.length})</CardTitle>
              <div className="text-xs text-muted-foreground">
                Cambios activos: <strong>{cambios.length}</strong>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="p-2">Empleado</th>
                      <th className="p-2">Sucursal</th>
                      <th className="p-2">Origen</th>
                      <th className="p-2">Entrada</th>
                      <th className="p-2">Salida</th>
                      <th className="p-2">Horas</th>
                      <th className="p-2 text-right">Mover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asignaciones
                      .filter((a) => sucursalFiltro === "all" || a.sucursal_id === sucursalFiltro)
                      .sort((x, y) => x.empleado_nombre.localeCompare(y.empleado_nombre))
                      .map((a) => {
                        const base = asignacionesBase.find((b) => b.empleado_id === a.empleado_id);
                        const changed = base && base.hora_entrada !== a.hora_entrada;
                        const sName = sucursales.find((s) => s.id === a.sucursal_id)?.nombre || "—";
                        return (
                          <tr key={a.empleado_id} className={`border-b hover:bg-accent/30 ${changed ? "bg-amber-50/60" : ""} ${empSel === a.empleado_id ? "ring-2 ring-primary/40" : ""}`}
                            onClick={() => setEmpSel((s) => (s === a.empleado_id ? null : a.empleado_id))}>
                            <td className="p-2 font-medium">{a.empleado_nombre}</td>
                            <td className="p-2 text-muted-foreground">{sName}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[10px]">{a.origen}</Badge>
                            </td>
                            <td className="p-2">
                              <Input
                                type="time"
                                value={a.hora_entrada}
                                onChange={(e) => setEntradaEmpleado(a.empleado_id, e.target.value)}
                                className="h-8 w-28"
                                onClick={(e) => e.stopPropagation()}
                              />
                              {changed && base && (
                                <div className="text-[10px] text-amber-700 mt-0.5">Antes: {base.hora_entrada}</div>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">{a.hora_salida}</td>
                            <td className="p-2 text-muted-foreground">{(a.duracion_min / 60).toFixed(1)}h</td>
                            <td className="p-2 text-right">
                              <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => shiftEmpleado(a.empleado_id, -30)}>
                                  −30
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => shiftEmpleado(a.empleado_id, -15)}>
                                  −15
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => shiftEmpleado(a.empleado_id, 15)}>
                                  +15
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => shiftEmpleado(a.empleado_id, 30)}>
                                  +30
                                </Button>
                                {changed && base && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEntradaEmpleado(a.empleado_id, base.hora_entrada)}>
                                    <Undo2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {asignaciones.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted-foreground p-6">
                          Sin asignaciones para este día.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
