import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Loader2,
  FileSpreadsheet,
  Palmtree,
  AlertTriangle,
  Sun,
  Clock,
  Flag,
  Search,
  ShieldCheck,
} from "lucide-react";
import { formatArgentinaDate, formatArgentinaTime } from "@/lib/dateUtils";
import { FeriadosTrabajadosTable, type FeriadoTrabajadoRow } from "@/components/novedades/FeriadosTrabajadosTable";
import { SelectorGrupoCompacto } from "@/components/empleados/SelectorGrupoCompacto";
import type { SeleccionEmpleados } from "@/lib/gruposEmpleados";
import { JustificarEventoDialog, type EventoJustificable } from "@/components/novedades/JustificarEventoDialog";

interface Sucursal { id: string; nombre: string }
interface EmpleadoLite { id: string; nombre: string; apellido: string; legajo: string | null; sucursal_id: string | null }

interface NovedadRow {
  empleado_id: string;
  empleado_nombre: string;
  empleado_apellido: string;
  empleado_legajo: string | null;
  sucursal_nombre: string | null;
  fecha: string;
  estado: string;
  detalle: string | null;
  hora_entrada_esperada: string | null;
  hora_salida_esperada: string | null;
}

interface DiaFichado {
  empleado_id: string;
  empleado: string;
  legajo: string | null;
  sucursal: string | null;
  fecha: string;            // yyyy-MM-dd (Argentina)
  entrada: string | null;   // HH:mm
  salida: string | null;    // HH:mm
  minutos_pausa: number;
  horas: number;            // salida - entrada
  domingo: boolean;
  extras_reales: number;    // horas por encima de 8
  extras_pagas: number;     // con redondeo
}

type Seccion = "vacaciones" | "incompletas" | "domingos" | "extras" | "feriados";

function redondearExtras(horas: number) {
  if (horas <= 0) return 0;
  const enteras = Math.floor(horas);
  const min = Math.round((horas - enteras) * 60);
  if (min >= 45) return enteras + 1;
  if (min >= 19) return enteras + 0.5;
  return enteras;
}

const hm = (h: number) => {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
};

export default function ResumenMes() {
  const hoy = new Date();
  const [mes, setMes] = useState(format(hoy, "yyyy-MM"));
  const [sucursalSel, setSucursalSel] = useState("todas");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("vacaciones");

  const [novedades, setNovedades] = useState<NovedadRow[]>([]);
  const [feriados, setFeriados] = useState<FeriadoTrabajadoRow[]>([]);
  const [dias, setDias] = useState<DiaFichado[]>([]);

  // Filtros extra
  const [seleccion, setSeleccion] = useState<SeleccionEmpleados | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Justificaciones: clave `${tipo_evento}|${empleado_id}|${fecha}`
  const [justificaciones, setJustificaciones] = useState<Map<string, { categoria_id: string; categoria: string; observacion: string | null; es_justificada: boolean }>>(new Map());
  const [eventoJust, setEventoJust] = useState<EventoJustificable | null>(null);

  const desde = useMemo(() => format(startOfMonth(parseISO(mes + "-01")), "yyyy-MM-dd"), [mes]);
  const hasta = useMemo(() => format(endOfMonth(parseISO(mes + "-01")), "yyyy-MM-dd"), [mes]);

  useEffect(() => {
    supabase.from("sucursales").select("id,nombre").order("nombre").then(({ data }) => setSucursales(data || []));
  }, []);

  const cargarJustificaciones = async () => {
    const { data, error } = await supabase
      .from("justificaciones_asistencia")
      .select("tipo_evento,empleado_id,fecha_evento,categoria_id,observacion,categorias_justificacion_asistencia(nombre,es_justificada)")
      .gte("fecha_evento", desde)
      .lte("fecha_evento", hasta);
    if (error) { console.error(error); return; }
    const map = new Map<string, { categoria_id: string; categoria: string; observacion: string | null; es_justificada: boolean }>();
    for (const j of (data || []) as any[]) {
      map.set(`${j.tipo_evento}|${j.empleado_id}|${j.fecha_evento}`, {
        categoria_id: j.categoria_id,
        categoria: j.categorias_justificacion_asistencia?.nombre || "—",
        observacion: j.observacion,
        es_justificada: !!j.categorias_justificacion_asistencia?.es_justificada,
      });
    }
    setJustificaciones(map);
  };


  const cargar = async () => {
    setLoading(true);
    try {
      const sucParam = sucursalSel !== "todas" ? [sucursalSel] : null;
      const [novRes, ferRes, empRes, sucRes, fichRes] = await Promise.all([
        supabase.rpc("get_novedades_liquidacion", { p_desde: desde, p_hasta: hasta, p_sucursales: sucParam } as any),
        supabase.rpc("get_feriados_trabajados", { p_desde: desde, p_hasta: hasta, p_sucursales: sucParam } as any),
        supabase.from("empleados").select("id,nombre,apellido,legajo,sucursal_id").eq("activo", true),
        supabase.from("sucursales").select("id,nombre"),
        supabase
          .from("fichajes")
          .select("empleado_id,tipo,timestamp_real")
          .gte("timestamp_real", `${desde}T00:00:00-03:00`)
          .lte("timestamp_real", `${hasta}T23:59:59-03:00`)
          .order("timestamp_real", { ascending: true })
          .limit(20000),
      ]);
      if (novRes.error) throw novRes.error;
      if (ferRes.error) throw ferRes.error;
      if (fichRes.error) throw fichRes.error;

      setNovedades((novRes.data || []) as NovedadRow[]);
      setFeriados((ferRes.data || []) as FeriadoTrabajadoRow[]);

      const empleados = (empRes.data || []) as EmpleadoLite[];
      const sucMap = new Map((sucRes.data || []).map((s: any) => [s.id, s.nombre]));
      const empMap = new Map(empleados.map((e) => [e.id, e]));

      // Agrupar fichajes por empleado + día (Argentina)
      const grupos = new Map<string, { entrada?: string; salida?: string; pausas: string[]; fin_pausas: string[] }>();
      for (const f of (fichRes.data || []) as any[]) {
        if (!empMap.has(f.empleado_id)) continue;
        const fecha = formatArgentinaDate(f.timestamp_real, "yyyy-MM-dd");
        const key = `${f.empleado_id}|${fecha}`;
        const g = grupos.get(key) || { pausas: [], fin_pausas: [] };
        if (f.tipo === "entrada" && !g.entrada) g.entrada = f.timestamp_real;
        if (f.tipo === "salida") g.salida = f.timestamp_real;
        if (f.tipo === "pausa_inicio") g.pausas.push(f.timestamp_real);
        if (f.tipo === "pausa_fin") g.fin_pausas.push(f.timestamp_real);
        grupos.set(key, g);
      }

      const resultado: DiaFichado[] = [];
      for (const [key, g] of grupos.entries()) {
        const [empleado_id, fecha] = key.split("|");
        const emp = empMap.get(empleado_id)!;
        let minutos_pausa = 0;
        g.pausas.forEach((ini, i) => {
          const fin = g.fin_pausas[i];
          if (fin) minutos_pausa += Math.floor((new Date(fin).getTime() - new Date(ini).getTime()) / 60000);
        });
        const horas = g.entrada && g.salida
          ? (new Date(g.salida).getTime() - new Date(g.entrada).getTime()) / 3600000
          : 0;
        const extras_reales = Math.max(0, horas - 8);
        resultado.push({
          empleado_id,
          empleado: `${emp.apellido}, ${emp.nombre}`,
          legajo: emp.legajo,
          sucursal: emp.sucursal_id ? sucMap.get(emp.sucursal_id) || null : null,
          fecha,
          entrada: g.entrada ? formatArgentinaTime(g.entrada, "HH:mm") : null,
          salida: g.salida ? formatArgentinaTime(g.salida, "HH:mm") : null,
          minutos_pausa,
          horas,
          domingo: parseISO(fecha + "T00:00:00").getDay() === 0,
          extras_reales,
          extras_pagas: redondearExtras(extras_reales),
        });
      }
      resultado.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.empleado.localeCompare(b.empleado));
      setDias(resultado);
      await cargarJustificaciones();
      toast.success("Resumen del mes actualizado");
    } catch (e: any) {
      console.error(e);
      toast.error("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [mes, sucursalSel]);

  // ---- Filtros de empleados ----
  const idsFiltro = useMemo(
    () => (seleccion?.empleadoIds?.length ? new Set(seleccion.empleadoIds) : null),
    [seleccion]
  );

  const pasa = (empleadoId: string, nombre: string) => {
    if (idsFiltro && !idsFiltro.has(empleadoId)) return false;
    const q = busqueda.trim().toLowerCase();
    if (q && !nombre.toLowerCase().includes(q)) return false;
    return true;
  };

  const jt = (tipo: string, empleadoId: string, fecha: string) =>
    justificaciones.get(`${tipo}|${empleadoId}|${fecha}`);

  const tipoEvento = (situacion: string) =>
    situacion === "Sin fichar" ? "sin_fichar" : situacion === "Sin salida" ? "sin_salida" : "sin_entrada";

  // ---- Datos por sección ----
  const vacaciones = useMemo(() => {
    const map = new Map<string, { empleado_id: string; empleado: string; legajo: string | null; sucursal: string | null; fechas: string[] }>();
    for (const n of novedades) {
      if (n.estado !== "VACACIONES") continue;
      const k = n.empleado_id;
      const cur = map.get(k) || {
        empleado_id: n.empleado_id,
        empleado: `${n.empleado_apellido}, ${n.empleado_nombre}`,
        legajo: n.empleado_legajo,
        sucursal: n.sucursal_nombre,
        fechas: [],
      };
      cur.fechas.push(n.fecha);
      map.set(k, cur);
    }
    return [...map.values()]
      .filter((v) => pasa(v.empleado_id, v.empleado))
      .map((v) => ({ ...v, fechas: v.fechas.sort(), dias: v.fechas.length }))
      .sort((a, b) => a.empleado.localeCompare(b.empleado));
  }, [novedades, idsFiltro, busqueda]);

  const incompletas = useMemo(() => {
    const rows: { empleado_id: string; empleado: string; legajo: string | null; sucursal: string | null; fecha: string; entrada: string | null; salida: string | null; tipo: string }[] = [];
    for (const d of dias) {
      if (d.entrada && !d.salida) rows.push({ ...d, tipo: "Sin salida" });
      else if (!d.entrada && d.salida) rows.push({ ...d, tipo: "Sin entrada" });
    }
    for (const n of novedades) {
      if (n.estado !== "NO_FICHADA" && n.estado !== "AUSENCIA_JUSTIFICADA") continue;
      rows.push({
        empleado_id: n.empleado_id,
        empleado: `${n.empleado_apellido}, ${n.empleado_nombre}`,
        legajo: n.empleado_legajo,
        sucursal: n.sucursal_nombre,
        fecha: n.fecha,
        entrada: n.hora_entrada_esperada?.slice(0, 5) || null,
        salida: n.hora_salida_esperada?.slice(0, 5) || null,
        tipo: n.estado === "AUSENCIA_JUSTIFICADA" ? "Sin fichar (justificada)" : "Sin fichar",
      });
    }
    return rows
      .filter((r) => pasa(r.empleado_id, r.empleado))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.empleado.localeCompare(b.empleado));
  }, [dias, novedades, idsFiltro, busqueda]);

  const domingos = useMemo(
    () => dias.filter((d) => d.domingo && (d.entrada || d.salida) && pasa(d.empleado_id, d.empleado)),
    [dias, idsFiltro, busqueda]
  );
  const extras = useMemo(
    () => dias.filter((d) => d.extras_pagas > 0 && pasa(d.empleado_id, d.empleado)),
    [dias, idsFiltro, busqueda]
  );
  const feriadosFiltrados = useMemo(
    () => feriados.filter((f: any) => pasa(f.empleado_id, `${f.empleado_apellido}, ${f.empleado_nombre}`)),
    [feriados, idsFiltro, busqueda]
  );

  const totales = {
    vacaciones: vacaciones.length,
    incompletas: incompletas.length,
    domingos: domingos.length,
    extras: extras.reduce((a, d) => a + d.extras_pagas, 0),
    feriados: feriadosFiltrados.length,
  };


  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vacaciones.map((v) => ({
      Legajo: v.legajo || "", Empleado: v.empleado, Sucursal: v.sucursal || "",
      "Días de vacaciones": v.dias,
      Fechas: v.fechas.map((f) => format(parseISO(f + "T00:00:00"), "dd/MM")).join(", "),
    }))), "Vacaciones");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incompletas.map((r) => {
      const j = jt(tipoEvento(r.tipo), r.empleado_id, r.fecha);
      return {
        Fecha: r.fecha, Legajo: r.legajo || "", Empleado: r.empleado, Sucursal: r.sucursal || "",
        Situación: r.tipo, Entrada: r.entrada || "", Salida: r.salida || "",
        Justificación: j?.categoria || "Sin justificar",
        Observación: j?.observacion || "",
      };
    })), "Fichadas incompletas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(domingos.map((d) => ({
      Fecha: d.fecha, Legajo: d.legajo || "", Empleado: d.empleado, Sucursal: d.sucursal || "",
      Entrada: d.entrada || "", Salida: d.salida || "", Horas: Number(d.horas.toFixed(2)),
    }))), "Domingos trabajados");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extras.map((d) => ({
      Fecha: d.fecha, Legajo: d.legajo || "", Empleado: d.empleado, Sucursal: d.sucursal || "",
      Entrada: d.entrada || "", Salida: d.salida || "",
      "Horas trabajadas": Number(d.horas.toFixed(2)),
      "Extras reales": Number(d.extras_reales.toFixed(2)),
      "Extras a pagar": d.extras_pagas,
    }))), "Horas extras");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feriadosFiltrados.map((f) => ({
      Fecha: f.fecha, Feriado: f.feriado_nombre, Legajo: f.empleado_legajo || "",
      Empleado: `${f.empleado_apellido}, ${f.empleado_nombre}`, Sucursal: f.sucursal_nombre || "",
      Entrada: f.hora_entrada?.slice(0, 5) || "", Salida: f.hora_salida?.slice(0, 5) || "",
      "Hs trabajadas": Number(Number(f.horas_trabajadas).toFixed(2)),
    }))), "Feriados trabajados");
    XLSX.writeFile(wb, `resumen_mes_${mes}.xlsx`);
    toast.success("Excel generado");
  };

  const tarjetas: { key: Seccion; label: string; icon: any; valor: string; color: string }[] = [
    { key: "vacaciones", label: "De vacaciones", icon: Palmtree, valor: `${totales.vacaciones} empleados`, color: "text-blue-600" },
    { key: "incompletas", label: "Fichadas incompletas / sin fichar", icon: AlertTriangle, valor: `${totales.incompletas} casos`, color: "text-amber-600" },
    { key: "domingos", label: "Trabajaron domingo", icon: Sun, valor: `${totales.domingos} jornadas`, color: "text-orange-600" },
    { key: "extras", label: "Horas extras", icon: Clock, valor: `${totales.extras} hs`, color: "text-purple-600" },
    { key: "feriados", label: "Trabajaron feriados", icon: Flag, valor: `${totales.feriados} jornadas`, color: "text-emerald-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Resumen del mes
          </CardTitle>
          <CardDescription>
            Vacaciones, fichadas incompletas, domingos, horas extras y feriados trabajados — {format(parseISO(mes + "-01"), "MMMM yyyy", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label>Mes</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label>Sucursal</Label>
            <Select value={sucursalSel} onValueChange={setSucursalSel}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Buscar empleado</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-56"
                placeholder="Apellido o nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <SelectorGrupoCompacto
            value={seleccion}
            onChange={setSeleccion}
            modulo="informes"
            label="Grupo de empleados"
            placeholderTodos="— Todos —"
          />
          <Button onClick={cargar} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
          </Button>
          <Button onClick={exportarExcel} disabled={loading}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </CardContent>
      </Card>


      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {tarjetas.map((t) => (
          <Card
            key={t.key}
            onClick={() => setSeccion(t.key)}
            className={`cursor-pointer transition-all hover:shadow-md ${seccion === t.key ? "ring-2 ring-primary" : ""}`}
          >
            <CardContent className="pt-6 space-y-1">
              <t.icon className={`h-5 w-5 ${t.color}`} />
              <p className="text-sm text-muted-foreground">{t.label}</p>
              <p className="text-xl font-bold">{t.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {tarjetas.find((t) => t.key === seccion)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : seccion === "vacaciones" ? (
            vacaciones.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sin vacaciones en el mes.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Empleado</TableHead><TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Días</TableHead><TableHead>Fechas</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {vacaciones.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{v.empleado}{v.legajo && <span className="text-xs text-muted-foreground ml-2">#{v.legajo}</span>}</TableCell>
                      <TableCell>{v.sucursal || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{v.dias}</TableCell>
                      <TableCell className="text-xs">{v.fechas.map((f) => format(parseISO(f + "T00:00:00"), "dd/MM")).join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : seccion === "incompletas" ? (
            incompletas.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sin novedades de fichadas.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Sucursal</TableHead>
                  <TableHead>Situación</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead>
                  <TableHead>Justificación</TableHead><TableHead className="text-right">Acción</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {incompletas.map((r, i) => {
                    const tipoEv = tipoEvento(r.tipo);
                    const j = jt(tipoEv, r.empleado_id, r.fecha);
                    return (
                      <TableRow key={i}>
                        <TableCell>{format(parseISO(r.fecha + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{r.empleado}</TableCell>
                        <TableCell>{r.sucursal || "—"}</TableCell>
                        <TableCell><Badge variant={r.tipo === "Sin fichar" ? "destructive" : "secondary"}>{r.tipo}</Badge></TableCell>
                        <TableCell>{r.entrada || "—"}</TableCell>
                        <TableCell>{r.salida || "—"}</TableCell>
                        <TableCell>
                          {j ? (
                            <div className="space-y-0.5">
                              <Badge variant={j.es_justificada ? "default" : "outline"}>{j.categoria}</Badge>
                              {j.observacion && <p className="text-xs text-muted-foreground">{j.observacion}</p>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin justificar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEventoJust({
                              empleado_id: r.empleado_id,
                              empleado: r.empleado,
                              fecha: r.fecha,
                              tipo_evento: tipoEv,
                              categoria_id: j?.categoria_id || null,
                              observacion: j?.observacion || null,
                            })}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            {j ? "Editar" : "Justificar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

              </Table>
            )
          ) : seccion === "domingos" ? (
            domingos.length === 0 ? <p className="text-center py-8 text-muted-foreground">Nadie trabajó domingos en el mes.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Sucursal</TableHead>
                  <TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead className="text-right">Horas</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {domingos.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{format(parseISO(d.fecha + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{d.empleado}</TableCell>
                      <TableCell>{d.sucursal || "—"}</TableCell>
                      <TableCell>{d.entrada || "—"}</TableCell>
                      <TableCell>{d.salida || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{d.salida ? hm(d.horas) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : seccion === "extras" ? (
            extras.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sin horas extras en el mes.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Sucursal</TableHead>
                  <TableHead>Entrada</TableHead><TableHead>Salida</TableHead>
                  <TableHead className="text-right">Trabajadas</TableHead>
                  <TableHead className="text-right">Exceso real</TableHead>
                  <TableHead className="text-right">A pagar</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {extras.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{format(parseISO(d.fecha + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{d.empleado}</TableCell>
                      <TableCell>{d.sucursal || "—"}</TableCell>
                      <TableCell>{d.entrada || "—"}</TableCell>
                      <TableCell>{d.salida || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{hm(d.horas)}</TableCell>
                      <TableCell className="text-right font-mono">{hm(d.extras_reales)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{d.extras_pagas} hs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <FeriadosTrabajadosTable rows={feriadosFiltrados} />
          )}
        </CardContent>
      </Card>

      <JustificarEventoDialog
        evento={eventoJust}
        open={!!eventoJust}
        onClose={() => setEventoJust(null)}
        onSaved={cargarJustificaciones}
      />
    </div>

  );
}
