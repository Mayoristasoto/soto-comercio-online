import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Plus,
  RotateCcw,
  Scissors,

  Trash2,
  Users,
} from "lucide-react";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import type { SeleccionEmpleados } from "@/lib/gruposEmpleados";
import { useDiaBorrador, type EdicionDia } from "@/hooks/useDiaBorrador";
import { useEsRRHH } from "@/hooks/useEsRRHH";

import {
  exportDiaPDF,
  exportDiaXLSX,
  type CoberturaHora,
  type FilaDiaExport,
} from "@/utils/horariosDiaExport";

interface EmpleadoBase {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  sucursal_id: string | null;
  activo: boolean;
}

interface FilaReal {
  empleado_id: string;
  nombre: string;
  sucursal_id: string | null;
  sucursal_nombre: string;
  turno_nombre: string;
  entrada: string;
  salida: string;
  pausa: number;
}

const HORA_DESDE = 6;
/** Jornada base: las horas por encima de este valor se consideran extras */
const JORNADA_BASE_HS = 8;

const HORA_HASTA = 23;

const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : "");

function horasEntre(entrada: string, salida: string, _pausaMin?: number) {
  const [eh, em] = entrada.split(":").map(Number);
  const [sh, sm] = salida.split(":").map(Number);
  if ([eh, em, sh, sm].some((n) => Number.isNaN(n))) return 0;
  let mins = sh * 60 + sm - (eh * 60 + em);
  if (mins < 0) mins += 24 * 60;
  // La pausa (40 min) está contemplada dentro de la jornada: no se descuenta
  return Math.max(0, mins / 60);
}

/** Redondeo de horas extras: >=19 min => 0.5 h, >=45 min => 1 h */
function redondearExtras(horas: number) {
  if (horas <= 0) return 0;
  const enteras = Math.floor(horas + 1e-9);
  const mins = Math.round((horas - enteras) * 60);
  if (mins >= 45) return enteras + 1;
  if (mins >= 19) return enteras + 0.5;
  return enteras;
}

function cubreHora(entrada: string, salida: string, hora: number) {
  const [eh, em] = entrada.split(":").map(Number);
  const [sh, sm] = salida.split(":").map(Number);
  if ([eh, em, sh, sm].some((n) => Number.isNaN(n))) return false;
  const ini = eh * 60 + em;
  let fin = sh * 60 + sm;
  if (fin <= ini) fin += 24 * 60;
  const h0 = hora * 60;
  const h1 = h0 + 60;
  return ini < h1 && fin > h0;
}

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface DatosDiaPlanificacion {
  fecha: string;
  filas: {
    key: string;
    empleado_id: string;
    nombre: string;
    sucursal_id: string | null;
    sucursal_nombre: string;
    entrada: string;
    salida: string;
    pausa: number;
    horas: number;
    extras: number;
    origen: FilaDiaExport["origen"];
  }[];
  filasExport: FilaDiaExport[];
  cobertura: CoberturaHora[];
  totalHoras: number;
  totalExtras: number;
  valorHoraExtra: number;
}

interface VistaDiaPlanificacionProps {
  /** Fecha controlada desde afuera (planificación semanal) */
  fecha?: string;
  onFechaChange?: (fecha: string) => void;
  /** Oculta el selector de fecha y el export del día */
  modoSemana?: boolean;
  onDatosChange?: (datos: DatosDiaPlanificacion) => void;
}

export function VistaDiaPlanificacion({
  fecha: fechaProp,
  onFechaChange,
  modoSemana = false,
  onDatosChange,
}: VistaDiaPlanificacionProps = {}) {
  const { toast } = useToast();
  const { esRRHH } = useEsRRHH();
  /** Solo RRHH ve valores y costos de horas extras */
  const verCostos = esRRHH;

  const [fechaInterna, setFechaInterna] = useState(hoyISO());
  const fecha = fechaProp ?? fechaInterna;
  const setFecha = (v: string) => {
    if (onFechaChange) onFechaChange(v);
    else setFechaInterna(v);
  };
  const [loading, setLoading] = useState(true);

  const [filasReales, setFilasReales] = useState<FilaReal[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoBase[]>([]);
  const [empleadosVacaciones, setEmpleadosVacaciones] = useState<Set<string>>(new Set());
  const [sucursalFiltro, setSucursalFiltro] = useState<string>("todas");
  const [grupoSel, setGrupoSel] = useState<SeleccionEmpleados | null>(null);
  const [valorHoraExtra, setValorHoraExtra] = useState<number>(() => {
    const v = Number(localStorage.getItem("fichero:valor-hora-extra"));
    return Number.isFinite(v) && v > 0 ? v : 0;
  });

  useEffect(() => {
    localStorage.setItem("fichero:valor-hora-extra", String(valorHoraExtra || 0));
  }, [valorHoraExtra]);

  // Valor de referencia tomado de la pestaña "Horas extras" (config_horas_extras_v4)
  const valorHoraConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem("config_horas_extras_v4");
      if (!raw) return 0;
      const cfg = JSON.parse(raw);
      const esDomingo = new Date(`${fecha}T00:00:00`).getDay() === 0;
      const v = Number(esDomingo ? cfg.valorHoraDomingo : cfg.valorHoraHabil);
      return Number.isFinite(v) && v > 0 ? v : 0;
    } catch {
      return 0;
    }
  }, [fecha]);

  // Si no se cargó un valor manual, se usa el de la configuración de Horas extras
  const valorHoraEfectivo = valorHoraExtra > 0 ? valorHoraExtra : valorHoraConfig;


  const [addOpen, setAddOpen] = useState(false);
  const [addEmpleadoId, setAddEmpleadoId] = useState<string>("");
  const [addBusqueda, setAddBusqueda] = useState("");
  const [addSucursalId, setAddSucursalId] = useState<string>("");
  const [addEntrada, setAddEntrada] = useState("09:00");
  const [addSalida, setAddSalida] = useState("17:00");
  const [addPausa, setAddPausa] = useState(0);

  const [dividirFila, setDividirFila] = useState<null | {
    empleado_id: string;
    nombre: string;
    sucursal_id: string | null;
    tramo_id: string | null;
    entrada: string;
    salida: string;
    pausa: number;
  }>(null);
  const [t1Entrada, setT1Entrada] = useState("08:00");
  const [t1Salida, setT1Salida] = useState("12:00");
  const [t1Sucursal, setT1Sucursal] = useState<string>("");
  const [t2Entrada, setT2Entrada] = useState("16:00");
  const [t2Salida, setT2Salida] = useState("20:00");
  const [t2Sucursal, setT2Sucursal] = useState<string>("");

  const {
    borrador,
    editar,
    editarTramo,
    agregar,
    agregarVarios,
    quitar,
    quitarTramo,
    setExtra,
    restablecer,
    tieneCambios,
  } = useDiaBorrador(fecha);


  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: sucs }, { data: emps }, { data: asignaciones }, { data: vacs }] = await Promise.all([
          supabase.from("sucursales").select("id, nombre").order("nombre"),
          supabase
            .from("empleados")
            .select("id, nombre, apellido, legajo, sucursal_id, activo")
            .eq("activo", true)
            .order("apellido"),
          supabase
            .from("empleado_turnos")
            .select("id, empleado:empleados(*), turno:fichado_turnos(*)")
            .eq("activo", true)
            .lte("fecha_inicio", fecha)
            .or(`fecha_fin.is.null,fecha_fin.gte.${fecha}`),
          // Vacaciones aprobadas, gozadas o pendientes de aprobación que cubren la fecha
          supabase
            .from("solicitudes_vacaciones")
            .select("empleado_id, fecha_inicio, fecha_fin, estado")
            .in("estado", ["pendiente", "aprobada", "gozadas"])
            .lte("fecha_inicio", fecha)
            .gte("fecha_fin", fecha),
        ]);

        if (cancelado) return;

        const enVacaciones = new Set(((vacs || []) as any[]).map((v) => v.empleado_id));
        setEmpleadosVacaciones(enVacaciones);

        const sucList = (sucs || []) as { id: string; nombre: string }[];
        setSucursales(sucList);
        setEmpleados(((emps || []) as EmpleadoBase[]).filter((e) => !enVacaciones.has(e.id)));

        const nombreSuc = new Map(sucList.map((s) => [s.id, s.nombre]));
        const diaSemana = new Date(`${fecha}T00:00:00`).getDay();

        const filas: FilaReal[] = [];
        for (const a of (asignaciones || []) as any[]) {
          const emp = a.empleado;
          const turno = a.turno;
          if (!emp || !turno || emp.activo === false) continue;
          // No se planifica a quien está de vacaciones (aprobadas, gozadas o pendientes)
          if (enVacaciones.has(emp.id)) continue;
          if (Array.isArray(turno.dias_semana) && turno.dias_semana.length > 0) {
            if (!turno.dias_semana.includes(diaSemana)) continue;
          }
          const porDia = turno.horarios_por_dia?.[String(diaSemana)];
          filas.push({
            empleado_id: emp.id,
            nombre: `${emp.apellido}, ${emp.nombre}`,
            sucursal_id: emp.sucursal_id ?? null,
            sucursal_nombre: nombreSuc.get(emp.sucursal_id) || "Sin sucursal",
            turno_nombre: turno.nombre || "—",
            entrada: hhmm(porDia?.hora_entrada || turno.hora_entrada),
            salida: hhmm(porDia?.hora_salida || turno.hora_salida),
            pausa: turno.duracion_pausa_minutos ?? 0,
          });
        }
        filas.sort((a, b) => a.sucursal_nombre.localeCompare(b.sucursal_nombre) || a.nombre.localeCompare(b.nombre));
        setFilasReales(filas);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: "No se pudieron cargar los horarios del día", variant: "destructive" });
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [fecha, toast]);

  const filas = useMemo(() => {
    const base = (borrador.soloAgregados ? [] : filasReales)
      .filter((f) => !borrador.eliminados.includes(f.empleado_id))
      .map((f) => {
        const ed = borrador.ediciones[f.empleado_id];
        return {
          ...f,
          key: `real-${f.empleado_id}`,
          tramo_id: null as string | null,
          entrada: ed?.entrada ?? f.entrada,
          salida: ed?.salida ?? f.salida,
          pausa: ed?.pausa ?? f.pausa,
          origen: (ed ? "modificado" : "real") as FilaDiaExport["origen"],
          extrasManual: borrador.extras?.[`real-${f.empleado_id}`] ?? null,
          extras: 0,
        };
      });

    const extra = borrador.agregados
      .filter((a) => !empleadosVacaciones.has(a.empleado_id))
      .map((a) => ({
      key: `tramo-${a.id}`,
      tramo_id: a.id,
      empleado_id: a.empleado_id,
      nombre: a.nombre,
      sucursal_id: a.sucursal_id,
      sucursal_nombre: a.sucursal_nombre,
      turno_nombre: "Provisorio",
      entrada: a.entrada,
      salida: a.salida,
      pausa: a.pausa,
      origen: "provisorio" as FilaDiaExport["origen"],
      extrasManual: borrador.extras?.[`tramo-${a.id}`] ?? null,
      extras: 0,
    }));

    const todas = [...base, ...extra];

    // Horas extras automáticas: excedente sobre 8 hs por empleado (sumando todos sus tramos).
    // Se imputa al último tramo del día; un valor manual siempre tiene prioridad.
    const horasPorEmpleado: Record<string, number> = {};
    for (const f of todas) {
      horasPorEmpleado[f.empleado_id] =
        (horasPorEmpleado[f.empleado_id] ?? 0) + horasEntre(f.entrada, f.salida, f.pausa);
    }
    const ultimoTramo: Record<string, string> = {};
    for (const f of todas) {
      const actual = ultimoTramo[f.empleado_id];
      const actualFila = todas.find((x) => x.key === actual);
      if (!actual || f.salida > (actualFila?.salida ?? "")) ultimoTramo[f.empleado_id] = f.key;
    }
    for (const f of todas) {
      const auto =
        ultimoTramo[f.empleado_id] === f.key
          ? redondearExtras((horasPorEmpleado[f.empleado_id] ?? 0) - JORNADA_BASE_HS)
          : 0;
      f.extras = f.extrasManual != null ? f.extrasManual : auto;
    }

    const idsGrupo = grupoSel?.empleadoIds ?? null;

    return todas
      .filter((f) => (sucursalFiltro === "todas" ? true : f.sucursal_id === sucursalFiltro))
      .filter((f) => (idsGrupo ? idsGrupo.includes(f.empleado_id) : true))
      .sort(
        (a, b) =>
          a.sucursal_nombre.localeCompare(b.sucursal_nombre) ||
          a.nombre.localeCompare(b.nombre) ||
          a.entrada.localeCompare(b.entrada)
      );
  }, [filasReales, borrador, sucursalFiltro, grupoSel, empleadosVacaciones]);



  const horas = useMemo(
    () => Array.from({ length: HORA_HASTA - HORA_DESDE + 1 }, (_, i) => HORA_DESDE + i),
    []
  );

  const cobertura: CoberturaHora[] = useMemo(
    () =>
      horas.map((h) => {
        const porSucursal: Record<string, number> = {};
        let cantidad = 0;
        for (const f of filas) {
          if (cubreHora(f.entrada, f.salida, h)) {
            cantidad++;
            porSucursal[f.sucursal_nombre] = (porSucursal[f.sucursal_nombre] ?? 0) + 1;
          }
        }
        return { hora: `${String(h).padStart(2, "0")}:00`, cantidad, porSucursal };
      }),
    [filas, horas]
  );

  const totalHoras = filas.reduce((a, f) => a + horasEntre(f.entrada, f.salida, f.pausa), 0);
  const totalExtras = filas.reduce((a, f) => a + (f.extras || 0), 0);
  const costoExtras = totalExtras * (valorHoraEfectivo || 0);
  const picoCobertura = cobertura.reduce((max, c) => Math.max(max, c.cantidad), 0);

  const sucursalesEnVista = useMemo(
    () => Array.from(new Set(filas.map((f) => f.sucursal_nombre))).sort((a, b) => a.localeCompare(b)),
    [filas]
  );

  const picoPorSucursal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sucursalesEnVista) {
      m[s] = cobertura.reduce((mx, c) => Math.max(mx, c.porSucursal[s] ?? 0), 0);
    }
    return m;
  }, [cobertura, sucursalesEnVista]);

  const minutosDeHora = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return Number.isNaN(h) ? 0 : h * 60 + (m || 0);
  };
  const INICIO_MIN = HORA_DESDE * 60;
  const TOTAL_MIN = (HORA_HASTA + 1 - HORA_DESDE) * 60;
  const barra = (entrada: string, salida: string) => {
    const ini = minutosDeHora(entrada);
    let fin = minutosDeHora(salida);
    if (fin <= ini) fin += 24 * 60;
    const left = ((Math.max(ini, INICIO_MIN) - INICIO_MIN) / TOTAL_MIN) * 100;
    const right = ((Math.min(fin, INICIO_MIN + TOTAL_MIN) - INICIO_MIN) / TOTAL_MIN) * 100;
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(0, right - left)}%` };
  };

  const filasExport: FilaDiaExport[] = filas.map((f) => ({
    empleado_id: f.empleado_id,
    nombre: f.nombre,
    sucursal_nombre: f.sucursal_nombre,
    turno_nombre: f.turno_nombre,
    entrada: f.entrada,
    salida: f.salida,
    pausa: f.pausa,
    horas: horasEntre(f.entrada, f.salida, f.pausa),
    extras: f.extras || 0,
    costoExtra: (f.extras || 0) * (valorHoraEfectivo || 0),
    origen: f.origen,
  }));

  useEffect(() => {
    if (!onDatosChange || loading) return;
    onDatosChange({
      fecha,
      filas: filas.map((f) => ({
        key: f.key,
        empleado_id: f.empleado_id,
        nombre: f.nombre,
        sucursal_id: f.sucursal_id,
        sucursal_nombre: f.sucursal_nombre,
        entrada: f.entrada,
        salida: f.salida,
        pausa: f.pausa,
        horas: horasEntre(f.entrada, f.salida, f.pausa),
        extras: f.extras || 0,
        origen: f.origen,
      })),
      filasExport,
      cobertura,
      totalHoras,
      totalExtras,
      valorHoraExtra: valorHoraEfectivo || 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, loading, filas, cobertura, valorHoraEfectivo]);



  const filtrosTexto = [
    sucursalFiltro === "todas"
      ? "Todas las sucursales"
      : sucursales.find((s) => s.id === sucursalFiltro)?.nombre || "Sucursal",
    grupoSel ? `Grupo: ${grupoSel.empleadoIds.length} empleados` : "Todos los empleados",
  ].join(" · ");

  const cambiarDia = (delta: number) => {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setFecha(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  };

  const baseDe = (empleadoId: string): EdicionDia => {
    const f = filas.find((x) => x.empleado_id === empleadoId && !x.tramo_id)!;
    return { entrada: f.entrada, salida: f.salida, pausa: f.pausa };
  };

  const nombreSucursal = (id: string | null) =>
    sucursales.find((s) => s.id === id)?.nombre || "Sin sucursal";

  // Se permite volver a elegir un empleado ya presente (horario cortado / otra sucursal)
  const empleadosDisponibles = empleados
    .filter((e) =>
      addBusqueda
        ? `${e.apellido} ${e.nombre} ${e.legajo ?? ""}`.toLowerCase().includes(addBusqueda.toLowerCase())
        : true
    )
    .slice(0, 50);

  const confirmarAgregar = () => {
    const emp = empleados.find((e) => e.id === addEmpleadoId);
    if (!emp) return;
    const sucId = addSucursalId || emp.sucursal_id;
    agregar({
      empleado_id: emp.id,
      nombre: `${emp.apellido}, ${emp.nombre}`,
      sucursal_id: sucId,
      sucursal_nombre: nombreSucursal(sucId),
      entrada: addEntrada,
      salida: addSalida,
      pausa: addPausa,
    });
    setAddOpen(false);
    setAddEmpleadoId("");
    setAddBusqueda("");
    setAddSucursalId("");
  };

  const abrirDividir = (f: (typeof filas)[number]) => {
    setDividirFila({
      empleado_id: f.empleado_id,
      nombre: f.nombre,
      sucursal_id: f.sucursal_id,
      tramo_id: f.tramo_id,
      entrada: f.entrada,
      salida: f.salida,
      pausa: f.pausa,
    });
    const mid = (() => {
      const [eh, em] = f.entrada.split(":").map(Number);
      const [sh, sm] = f.salida.split(":").map(Number);
      if ([eh, em, sh, sm].some((n) => Number.isNaN(n))) return null;
      let ini = eh * 60 + em;
      let fin = sh * 60 + sm;
      if (fin <= ini) fin += 24 * 60;
      const m = Math.round((ini + fin) / 2 / 30) * 30;
      return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    })();
    setT1Entrada(f.entrada);
    setT1Salida(mid || f.salida);
    setT2Entrada(mid || f.entrada);
    setT2Salida(f.salida);
    setT1Sucursal(f.sucursal_id || "");
    setT2Sucursal(f.sucursal_id || "");
  };

  const confirmarDividir = () => {
    if (!dividirFila) return;
    const tramos = [
      { entrada: t1Entrada, salida: t1Salida, suc: t1Sucursal || dividirFila.sucursal_id },
      { entrada: t2Entrada, salida: t2Salida, suc: t2Sucursal || dividirFila.sucursal_id },
    ].map((t) => ({
      empleado_id: dividirFila.empleado_id,
      nombre: dividirFila.nombre,
      sucursal_id: t.suc,
      sucursal_nombre: nombreSucursal(t.suc),
      entrada: t.entrada,
      salida: t.salida,
      pausa: 0,
    }));

    if (dividirFila.tramo_id) {
      quitarTramo(dividirFila.tramo_id);
      agregarVarios(tramos);
    } else {
      agregarVarios(tramos, dividirFila.empleado_id);
    }
    setDividirFila(null);
    toast({ title: "Turno dividido", description: "Se crearon 2 tramos provisorios" });
  };


  return (
    <div className="space-y-4">
      {/* Barra del día */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className={`flex items-center gap-2 ${modoSemana ? "hidden" : ""}`}>
            <Button variant="outline" size="icon" onClick={() => cambiarDia(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-[170px]"
            />
            <Button variant="outline" size="icon" onClick={() => cambiarDia(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setFecha(hoyISO())}>
              Hoy
            </Button>
          </div>

          <div className="min-w-[180px]">
            <Label className="text-xs">Sucursal</Label>
            <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px]">
            <SelectorGrupoCompacto
              value={grupoSel}
              onChange={setGrupoSel}
              modulo="fichero"
              label="Grupo de empleados"
            />
          </div>

          {verCostos && (
          <div className="min-w-[170px]">
            <Label className="text-xs">Valor hora extra ($)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={valorHoraExtra || ""}
              placeholder={valorHoraConfig ? String(valorHoraConfig) : "0"}
              onChange={(e) => setValorHoraExtra(Number(e.target.value) || 0)}
            />
            {valorHoraConfig > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {valorHoraExtra > 0 ? (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setValorHoraExtra(0)}
                  >
                    Usar $ {valorHoraConfig.toLocaleString("es-AR")} de Horas extras
                  </button>
                ) : (
                  <>Usando $ {valorHoraConfig.toLocaleString("es-AR")} de Horas extras</>
                )}
              </p>
            )}
          </div>
          )}



          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar empleado
            </Button>
            <Button variant="outline" onClick={restablecer} disabled={!tieneCambios}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restablecer
            </Button>
            {!modoSemana && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar día
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportDiaXLSX(fecha, filasExport, cobertura, filtrosTexto, valorHoraEfectivo)}>
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportDiaPDF(fecha, filasExport, cobertura, filtrosTexto, valorHoraEfectivo)}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {!modoSemana && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0" />
          Simulación informativa — no modifica los horarios asignados. Los cambios quedan guardados solo en
          este navegador.
        </div>
      )}


      {/* Resumen */}
      <div className="grid gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Empleados</p>
            <p className="text-2xl font-bold">{filas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Horas programadas</p>
            <p className="text-2xl font-bold">{totalHoras.toFixed(1)} h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pico de cobertura</p>
            <p className="text-2xl font-bold">{picoCobertura}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Costo horas extras</p>
            <p className="text-2xl font-bold">
              $ {costoExtras.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-muted-foreground">{totalExtras.toFixed(1)} h extras</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Provisorios</p>
            <p className="text-2xl font-bold">
              {filas.filter((f) => f.origen !== "real").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cobertura por hora */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cobertura por hora
          </CardTitle>
          <CardDescription>Cantidad de empleados presentes en cada franja</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex gap-1 min-w-[720px]">
            {cobertura.map((c) => (
              <div key={c.hora} className="flex-1 text-center">
                <div
                  className="rounded text-xs py-1 font-medium"
                  style={{
                    backgroundColor:
                      c.cantidad === 0
                        ? "hsl(var(--muted))"
                        : `hsl(var(--primary) / ${Math.min(1, 0.2 + c.cantidad / Math.max(picoCobertura, 1) * 0.8)})`,
                    color: c.cantidad === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
                  }}
                >
                  {c.cantidad}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{c.hora.slice(0, 2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cobertura por hora y sucursal */}
      {sucursalesEnVista.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Cobertura por hora y sucursal
            </CardTitle>
            <CardDescription>Empleados presentes en cada franja, por sucursal</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs border-separate border-spacing-[2px]">
              <thead>
                <tr>
                  <th className="text-left font-medium text-muted-foreground px-2">Sucursal</th>
                  {cobertura.map((c) => (
                    <th key={c.hora} className="font-medium text-muted-foreground">
                      {c.hora.slice(0, 2)}
                    </th>
                  ))}
                  <th className="font-medium text-muted-foreground px-2">Pico</th>
                </tr>
              </thead>
              <tbody>
                {sucursalesEnVista.map((s) => (
                  <tr key={s}>
                    <td className="px-2 whitespace-nowrap font-medium">{s}</td>
                    {cobertura.map((c) => {
                      const n = c.porSucursal[s] ?? 0;
                      return (
                        <td key={c.hora} className="text-center">
                          <div
                            className="rounded py-1 font-medium"
                            style={{
                              backgroundColor:
                                n === 0
                                  ? "hsl(var(--muted))"
                                  : `hsl(var(--primary) / ${Math.min(1, 0.2 + (n / Math.max(picoPorSucursal[s] || 1, 1)) * 0.8)})`,
                              color: n === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
                            }}
                          >
                            {n || "-"}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-2 font-semibold">{picoPorSucursal[s] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de empleados seleccionados */}
      {filas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gráfico de horarios</CardTitle>
            <CardDescription>Franja horaria de cada empleado seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[820px] space-y-1">
              <div className="flex">
                <div className="w-[210px] shrink-0" />
                <div className="flex-1 flex">
                  {horas.map((h) => (
                    <div key={h} className="flex-1 text-[10px] text-muted-foreground text-center">
                      {String(h).padStart(2, "0")}
                    </div>
                  ))}
                </div>
              </div>
              {sucursalesEnVista.map((suc) => {
                const delGrupo = filas.filter((f) => f.sucursal_nombre === suc);
                if (delGrupo.length === 0) return null;
                // Un empleado con varios tramos en la misma sucursal va en una sola línea
                const porEmpleado = new Map<string, typeof delGrupo>();
                for (const f of delGrupo) {
                  const arr = porEmpleado.get(f.empleado_id) ?? [];
                  arr.push(f);
                  porEmpleado.set(f.empleado_id, arr);
                }
                const lineas = Array.from(porEmpleado.values()).map((tramos) =>
                  [...tramos].sort((a, b) => a.entrada.localeCompare(b.entrada))
                );
                return (
                  <div key={`grp-${suc}`} className="pt-2 first:pt-0">
                    <div className="flex items-center gap-2 mb-1 border-t pt-2">
                      <span className="text-xs font-semibold">{suc}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {lineas.length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {lineas.map((tramos) => (
                        <div key={`g-${tramos[0].key}`} className="flex items-center">
                          <div className="w-[210px] shrink-0 pr-2 truncate text-xs font-medium">
                            {tramos[0].nombre}
                          </div>
                          <div className="flex-1 relative h-6 rounded bg-muted/50">
                            {horas.map((h, i) => (
                              <div
                                key={h}
                                className="absolute top-0 bottom-0 border-l border-border/50"
                                style={{ left: `${(i / horas.length) * 100}%` }}
                              />
                            ))}
                            {tramos.map((f) => (
                              <div
                                key={`b-${f.key}`}
                                className={`absolute top-0.5 bottom-0.5 rounded px-1 text-[10px] flex items-center overflow-hidden ${
                                  f.origen === "real"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-accent text-accent-foreground"
                                }`}
                                style={barra(f.entrada, f.salida)}
                              >
                                {f.entrada}–{f.salida}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

            </div>
          </CardContent>
        </Card>
      )}



      {/* Tabla editable del día */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Planificación del día</CardTitle>
          <CardDescription>
            Editá horarios o sumá empleados para organizar este día puntual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando...</p>
          ) : filas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay empleados con horario para este día
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="w-[120px]">Entrada</TableHead>
                  <TableHead className="w-[120px]">Salida</TableHead>
                  <TableHead className="w-[100px]">Pausa</TableHead>
                  <TableHead className="w-[70px]">Horas</TableHead>
                  <TableHead className="w-[110px]">H. extras</TableHead>
                  <TableHead className="w-[110px]">Costo extra</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => {
                  const setCampo = (cambios: Partial<EdicionDia>) =>
                    f.tramo_id
                      ? editarTramo(f.tramo_id, cambios)
                      : editar(f.empleado_id, cambios, baseDe(f.empleado_id));
                  const tramosDelEmpleado = filas.filter((x) => x.empleado_id === f.empleado_id).length;
                  return (
                  <TableRow key={f.key} className={f.origen !== "real" ? "bg-amber-50/60 dark:bg-amber-950/10" : ""}>
                    <TableCell className="text-sm">
                      {f.tramo_id ? (
                        <Select
                          value={f.sucursal_id ?? "sin"}
                          onValueChange={(v) =>
                            editarTramo(f.tramo_id!, {
                              sucursal_id: v === "sin" ? null : v,
                              sucursal_nombre: v === "sin" ? "Sin sucursal" : nombreSucursal(v),
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin">Sin sucursal</SelectItem>
                            {sucursales.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        f.sucursal_nombre
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {f.nombre}
                      {f.origen !== "real" && (
                        <Badge variant="outline" className="ml-2 text-[10px] border-amber-500 text-amber-700">
                          provisorio
                        </Badge>
                      )}
                      {tramosDelEmpleado > 1 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {tramosDelEmpleado} tramos
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.turno_nombre}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={f.entrada}
                        onChange={(e) => setCampo({ entrada: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={f.salida}
                        onChange={(e) => setCampo({ salida: e.target.value })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={f.pausa}
                        onChange={(e) => setCampo({ pausa: Number(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {horasEntre(f.entrada, f.salida, f.pausa).toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={f.extras || ""}
                        placeholder="0"
                        title={
                          f.extrasManual != null
                            ? "Valor manual (dejalo en 0 para volver al cálculo automático)"
                            : "Automático: excedente sobre 8 hs del empleado"
                        }
                        onChange={(e) => setExtra(f.key, Number(e.target.value) || 0)}
                        className={`h-8 ${f.extrasManual == null && (f.extras || 0) > 0 ? "text-muted-foreground" : ""}`}
                      />

                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {(f.extras || 0) > 0 && valorHoraEfectivo > 0
                        ? `$ ${((f.extras || 0) * valorHoraEfectivo).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Dividir en dos tramos"
                          onClick={() => abrirDividir(f)}
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => (f.tramo_id ? quitarTramo(f.tramo_id) : quitar(f.empleado_id))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}

              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogo agregar empleado / tramo */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar tramo al día</DialogTitle>
            <CardDescription>
              Podés sumar un empleado nuevo o un segundo tramo (horario cortado u otra sucursal) para
              alguien que ya está en la lista.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Apellido, nombre o legajo"
                value={addBusqueda}
                onChange={(e) => setAddBusqueda(e.target.value)}
              />
            </div>
            <div>
              <Label>Empleado</Label>
              <Select value={addEmpleadoId} onValueChange={setAddEmpleadoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleadosDisponibles.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.apellido}, {e.nombre}
                      {e.legajo ? ` (${e.legajo})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sucursal del tramo</Label>
              <Select
                value={
                  addSucursalId ||
                  empleados.find((e) => e.id === addEmpleadoId)?.sucursal_id ||
                  "sin"
                }
                onValueChange={(v) => setAddSucursalId(v === "sin" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin">Sin sucursal</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">

              <div>
                <Label>Entrada</Label>
                <Input type="time" value={addEntrada} onChange={(e) => setAddEntrada(e.target.value)} />
              </div>
              <div>
                <Label>Salida</Label>
                <Input type="time" value={addSalida} onChange={(e) => setAddSalida(e.target.value)} />
              </div>
              <div>
                <Label>Pausa (min)</Label>
                <Input
                  type="number"
                  min={0}
                  value={addPausa}
                  onChange={(e) => setAddPausa(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAgregar} disabled={!addEmpleadoId}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo dividir turno */}
      <Dialog open={!!dividirFila} onOpenChange={(o) => !o && setDividirFila(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dividir jornada — {dividirFila?.nombre}</DialogTitle>
            <CardDescription>
              Horario cortado o reparto de horas entre sucursales. Se reemplaza la fila por dos tramos
              provisorios.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              {
                titulo: "Tramo 1",
                entrada: t1Entrada,
                salida: t1Salida,
                suc: t1Sucursal,
                setEntrada: setT1Entrada,
                setSalida: setT1Salida,
                setSuc: setT1Sucursal,
              },
              {
                titulo: "Tramo 2",
                entrada: t2Entrada,
                salida: t2Salida,
                suc: t2Sucursal,
                setEntrada: setT2Entrada,
                setSalida: setT2Salida,
                setSuc: setT2Sucursal,
              },
            ].map((t) => (
              <div key={t.titulo} className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-semibold">
                  {t.titulo}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({horasEntre(t.entrada, t.salida, 0).toFixed(1)} h)
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Entrada</Label>
                    <Input type="time" value={t.entrada} onChange={(e) => t.setEntrada(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Salida</Label>
                    <Input type="time" value={t.salida} onChange={(e) => t.setSalida(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Sucursal</Label>
                    <Select
                      value={t.suc || "sin"}
                      onValueChange={(v) => t.setSuc(v === "sin" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin">Sin sucursal</SelectItem>
                        {sucursales.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDividirFila(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarDividir}>Dividir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}

export default VistaDiaPlanificacion;
