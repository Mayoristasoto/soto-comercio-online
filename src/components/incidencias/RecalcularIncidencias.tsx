import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, History } from "lucide-react";
import {
  clasificar, resumen, armarDecisiones, filtrarFilas, type FilaClasificada, type FilaPreview, type AccionRecalculo,
} from "@/lib/recalculoIncidencias";

const ETIQUETA: Record<AccionRecalculo, string> = {
  anular: "Ya no es incidencia", actualizar: "Cambian los minutos", crear: "Incidencia nueva", sin_cambios: "Sin cambios",
};
const VARIANTE: Record<AccionRecalculo, "destructive" | "secondary" | "default" | "outline"> = {
  anular: "secondary", actualizar: "outline", crear: "destructive", sin_cambios: "outline",
};
const clave = (f: FilaClasificada) => `${f.tipo}|${f.empleado_id}|${f.fecha}|${f.incidencia_id ?? ""}|${f.hora_real ?? ""}`;
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "—");
const fecha = (d: string) => d.split("-").reverse().join("/");

export default function RecalcularIncidencias() {
  const hoy = new Date();
  const [mes, setMes] = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`);
  const [sucursal, setSucursal] = useState("none");
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [filas, setFilas] = useState<FilaClasificada[] | null>(null);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<AccionRecalculo | "todas">("todas");
  const [verSinCambios, setVerSinCambios] = useState(false);
  const [empFiltro, setEmpFiltro] = useState("none");
  const [tipoFiltro, setTipoFiltro] = useState<"none" | "llegada_tarde" | "pausa_excedida">("none");
  const [sinSabado, setSinSabado] = useState(false);
  const [sinDomingo, setSinDomingo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);

  const cargarHistorial = async () => {
    const { data } = await supabase.from("recalculo_incidencias" as any).select("*").order("created_at", { ascending: false }).limit(10);
    setHistorial((data as any[]) ?? []);
  };
  useEffect(() => {
    supabase.from("sucursales").select("id,nombre").order("nombre").then(({ data }) => setSucursales(data ?? []));
    cargarHistorial();
  }, []);

  const recalcular = async () => {
    setCargando(true);
    const { data, error } = await supabase.rpc("recalcular_incidencias_preview" as any, {
      _mes: `${mes}-01`, _sucursal: sucursal === "none" ? null : sucursal, _empleado: null,
    } as any);
    setCargando(false);
    if (error) return toast.error(error.message);
    const c = clasificar((data as FilaPreview[]) ?? []);
    setFilas(c);
    setElegidas(new Set(c.filter((f) => f.sugerida).map(clave)));
  };

  const filtradas = useMemo(
    () => (filas ? filtrarFilas(filas, {
      empleadoId: empFiltro === "none" ? null : empFiltro,
      tipo: tipoFiltro === "none" ? null : tipoFiltro,
      excluirSabado: sinSabado, excluirDomingo: sinDomingo,
    }) : null),
    [filas, empFiltro, tipoFiltro, sinSabado, sinDomingo],
  );
  const empleadosOpc = useMemo(() => {
    const m = new Map<string, string>();
    (filas ?? []).forEach((f) => m.set(f.empleado_id, f.empleado));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [filas]);
  const visibles = useMemo(
    () => (filtradas ?? []).filter((f) => (verSinCambios || f.accion !== "sin_cambios") && (filtro === "todas" || f.accion === filtro)),
    [filtradas, filtro, verSinCambios],
  );
  const res = filtradas ? resumen(filtradas) : null;

  const toggle = (k: string) => setElegidas((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const marcarTipo = (a: AccionRecalculo, on: boolean) =>
    setElegidas((s) => { const n = new Set(s); (filtradas ?? []).filter((f) => f.accion === a).forEach((f) => (on ? n.add(clave(f)) : n.delete(clave(f)))); return n; });

  const aplicar = async () => {
    if (!filtradas) return;
    const items = armarDecisiones(filtradas, elegidas, clave);
    const n = items.filter((i) => i.decision === "aplicar").length;
    if (!n) return toast.error("No marcaste ninguna fila");
    if (!confirm(`Se van a aplicar ${n} correcciones. ¿Confirmás?`)) return;
    setAplicando(true);
    const { error } = await supabase.rpc("aplicar_recalculo_incidencias" as any, {
      _mes: `${mes}-01`, _sucursal: sucursal === "none" ? null : sucursal, _empleado: null, _items: items,
    } as any);
    setAplicando(false);
    if (error) return toast.error(error.message);
    toast.success(`${n} correcciones aplicadas`);
    cargarHistorial();
    recalcular();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Recalcular incidencias pasadas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vuelve a revisar el mes con los horarios vigentes hoy (cambios de horario, Horario 2 publicado, horario fijo). No cambia nada hasta que valides.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-xs">Mes</label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" /></div>
          <div>
            <label className="text-xs">Sucursal</label>
            <Select value={sucursal} onValueChange={setSucursal}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas</SelectItem>
                {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={recalcular} disabled={cargando}><RefreshCw className="h-4 w-4 mr-2" />{cargando ? "Calculando..." : "Recalcular"}</Button>
        </div>

        {filas && (
          <div className="flex flex-wrap gap-3 items-end rounded-lg border p-3">
            <div>
              <label className="text-xs">Empleado</label>
              <Select value={empFiltro} onValueChange={setEmpFiltro}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos</SelectItem>
                  {empleadosOpc.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs">Tipo de incidencia</label>
              <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as any)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas</SelectItem>
                  <SelectItem value="llegada_tarde">Llegada tarde</SelectItem>
                  <SelectItem value="pausa_excedida">Exceso de descanso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={sinSabado} onCheckedChange={(v) => setSinSabado(!!v)} />Excluir sábados</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={sinDomingo} onCheckedChange={(v) => setSinDomingo(!!v)} />Excluir domingos</label>
            <span className="text-xs text-muted-foreground">Solo se aplica lo que queda en el filtro.</span>
          </div>
        )}

        {res && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(ETIQUETA) as AccionRecalculo[]).map((a) => (
              <button key={a} onClick={() => setFiltro(filtro === a ? "todas" : a)}
                className={`rounded-lg border p-3 text-left ${filtro === a ? "ring-2 ring-primary" : ""}`}>
                <div className="text-2xl font-bold">{res[a]}</div>
                <div className="text-xs text-muted-foreground">{ETIQUETA[a]}</div>
                {a !== "sin_cambios" && res[a] > 0 && (
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="underline" onClick={(e) => { e.stopPropagation(); marcarTipo(a, true); }}>marcar</span>
                    <span className="underline" onClick={(e) => { e.stopPropagation(); marcarTipo(a, false); }}>desmarcar</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {filas && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={verSinCambios} onCheckedChange={(v) => setVerSinCambios(!!v)} /> Mostrar sin cambios
              </label>
              <Button onClick={aplicar} disabled={aplicando}>
                <CheckCircle2 className="h-4 w-4 mr-2" />{aplicando ? "Aplicando..." : `Validar y aplicar (${[...elegidas].length})`}
              </Button>
            </div>
            <div className="max-h-[560px] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead><TableHead>Empleado</TableHead><TableHead>Día</TableHead><TableHead>Tipo</TableHead>
                    <TableHead>Antes</TableHead><TableHead>Ahora</TableHead><TableHead>Resultado</TableHead><TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nada para revisar</TableCell></TableRow>}
                  {visibles.map((f) => {
                    const k = clave(f);
                    return (
                      <TableRow key={k}>
                        <TableCell>{f.accion !== "sin_cambios" && <Checkbox checked={elegidas.has(k)} onCheckedChange={() => toggle(k)} />}</TableCell>
                        <TableCell className="font-medium">{f.empleado}</TableCell>
                        <TableCell>{fecha(f.fecha)}</TableCell>
                        <TableCell>{f.tipo === "llegada_tarde" ? "Llegada tarde" : `Descanso ${hhmm(f.hora_real)}–${hhmm(f.hora_fin)}`}</TableCell>
                        <TableCell>
                          {f.incidencia_id ? `${f.minutos_antes ?? 0} min` : "—"}
                          {f.tipo === "llegada_tarde" && f.hora_programada_antes && <div className="text-xs text-muted-foreground">entrada {hhmm(f.hora_programada_antes)}</div>}
                          {f.justificado && <Badge variant="outline" className="ml-1">Justificada</Badge>}
                        </TableCell>
                        <TableCell>
                          {f.minutos_despues !== null ? `${f.minutos_despues} min` : "—"}
                          {f.tipo === "llegada_tarde" && <div className="text-xs text-muted-foreground">entrada {hhmm(f.hora_programada_despues)} · fichó {hhmm(f.hora_real)}</div>}
                        </TableCell>
                        <TableCell><Badge variant={VARIANTE[f.accion]}>{ETIQUETA[f.accion]}</Badge></TableCell>
                        <TableCell className="text-xs">{f.motivo}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Las incidencias anuladas no se borran: quedan con motivo "Recálculo por cambio de horario retroactivo". Los llamados de atención o apercibimientos ya creados no se borran solos; revisalos si bajó la cantidad del mes.
            </p>
          </>
        )}

        {historial.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-1"><History className="h-4 w-4" /> Recálculos aplicados</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {historial.map((h) => (
                <li key={h.id}>
                  {new Date(h.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} — mes {h.mes.slice(5, 7)}/{h.mes.slice(0, 4)}: {h.aplicadas} aplicadas, {h.descartadas} descartadas
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
