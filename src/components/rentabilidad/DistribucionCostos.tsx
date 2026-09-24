import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PieChart, Calculator, Save, Download, AlertTriangle } from "lucide-react";

type Pct = Record<string, number>; // centro_id -> %
interface Fila {
  empleado_id: string;
  nombre: string;
  horas: Record<string, number>;
  sinUbicacion: number;
  pct: Pct;
  origen: "fichadas" | "manual" | "fijo" | "sin_datos";
  bruto: number;
  cargas: number;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

export default function DistribucionCostos() {
  const qc = useQueryClient();
  const [periodoId, setPeriodoId] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const { data: periodos } = useQuery({
    queryKey: ["periodos_contables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("periodos_contables").select("*").order("fecha_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: centros } = useQuery({
    queryKey: ["centros_costo_activos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("centros_costo").select("id, nombre, sucursal_id").eq("activo", true).order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const { data: fijos } = useQuery({
    queryKey: ["empleado_centro_costo_fijo"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("empleado_centro_costo_fijo").select("empleado_id, centro_costo_id");
      if (error) throw error;
      return (data || []) as { empleado_id: string; centro_costo_id: string }[];
    },
  });

  const periodo = periodos?.find((p) => p.id === periodoId);

  const calcular = async () => {
    if (!periodo || !centros) return;
    setCalculando(true);
    try {
      const [{ data: dist, error: e1 }, { data: emps, error: e2 }, { data: recibos }, { data: cargas }, { data: confirmados }] =
        await Promise.all([
          (supabase as any).rpc("calcular_distribucion_costos", { p_desde: periodo.fecha_inicio, p_hasta: periodo.fecha_fin }),
          supabase.from("empleados").select("id, nombre, apellido, sucursal_id").eq("activo", true).order("apellido"),
          supabase.from("recibos_sueldo").select("empleado_id, total_remunerativo, total_haberes").eq("periodo", periodo.id),
          supabase.from("cargas_sociales_calculadas").select("empleado_id, total_cargas").eq("periodo_id", periodo.id),
          (supabase as any).from("distribucion_costos_empleado").select("*").eq("periodo", periodo.id),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const fijoMap = new Map((fijos || []).map((f) => [f.empleado_id, f.centro_costo_id]));
      const centroSucursal = new Map(centros.filter((c) => c.sucursal_id).map((c) => [c.sucursal_id!, c.id]));
      const confMap = new Map<string, Pct>();
      const confOrigen = new Map<string, string>();
      (confirmados || []).forEach((r: any) => {
        const p = confMap.get(r.empleado_id) || {};
        p[r.centro_costo_id] = Number(r.porcentaje);
        confMap.set(r.empleado_id, p);
        confOrigen.set(r.empleado_id, r.origen);
      });

      const result: Fila[] = (emps || []).map((e) => {
        const horas: Record<string, number> = {};
        let sinUbicacion = 0;
        (dist || []).filter((d: any) => d.empleado_id === e.id).forEach((d: any) => {
          if (d.centro_costo_id) horas[d.centro_costo_id] = Number(d.horas);
          else sinUbicacion += Number(d.horas);
        });
        const total = Object.values(horas).reduce((a, b) => a + b, 0);
        let pct: Pct = {};
        let origen: Fila["origen"] = "fichadas";
        if (confMap.has(e.id)) {
          pct = confMap.get(e.id)!;
          origen = (confOrigen.get(e.id) as any) || "manual";
        } else if (fijoMap.has(e.id)) {
          pct = { [fijoMap.get(e.id)!]: 100 };
          origen = "fijo";
        } else if (total > 0) {
          Object.entries(horas).forEach(([c, h]) => (pct[c] = Math.round((h / total) * 1000) / 10));
        } else if (e.sucursal_id && centroSucursal.get(e.sucursal_id)) {
          pct = { [centroSucursal.get(e.sucursal_id)!]: 100 };
          origen = "fijo";
        } else origen = "sin_datos";
        const rec = (recibos || []).find((r) => r.empleado_id === e.id);
        const car = (cargas || []).find((r) => r.empleado_id === e.id);
        return {
          empleado_id: e.id,
          nombre: `${e.apellido}, ${e.nombre}`,
          horas,
          sinUbicacion,
          pct,
          origen,
          bruto: Number(rec?.total_remunerativo ?? rec?.total_haberes ?? 0),
          cargas: Number(car?.total_cargas ?? 0),
        };
      });
      setFilas(result);
    } catch (err: any) {
      toast.error("Error al calcular: " + err.message);
    } finally {
      setCalculando(false);
    }
  };

  useEffect(() => {
    setFilas([]);
  }, [periodoId]);

  const setPct = (empId: string, centroId: string, val: number) =>
    setFilas((fs) => fs.map((f) => (f.empleado_id === empId ? { ...f, pct: { ...f.pct, [centroId]: val }, origen: "manual" } : f)));

  const setFijo = async (empId: string, centroId: string) => {
    if (centroId === "none") {
      await (supabase as any).from("empleado_centro_costo_fijo").delete().eq("empleado_id", empId);
    } else {
      const { error } = await (supabase as any).from("empleado_centro_costo_fijo").upsert({ empleado_id: empId, centro_costo_id: centroId });
      if (error) return toast.error(error.message);
      setFilas((fs) => fs.map((f) => (f.empleado_id === empId ? { ...f, pct: { [centroId]: 100 }, origen: "fijo" } : f)));
    }
    qc.invalidateQueries({ queryKey: ["empleado_centro_costo_fijo"] });
    toast.success("Centro fijo actualizado");
  };

  const sumaPct = (f: Fila) => Object.values(f.pct).reduce((a, b) => a + (Number(b) || 0), 0);
  const invalidas = filas.filter((f) => f.origen !== "sin_datos" && Math.abs(sumaPct(f) - 100) > 0.5);

  const totales = useMemo(() => {
    const t: Record<string, { horas: number; bruto: number; cargas: number }> = {};
    (centros || []).forEach((c) => (t[c.id] = { horas: 0, bruto: 0, cargas: 0 }));
    filas.forEach((f) =>
      Object.entries(f.pct).forEach(([c, p]) => {
        if (!t[c]) return;
        t[c].horas += f.horas[c] || 0;
        t[c].bruto += (f.bruto * p) / 100;
        t[c].cargas += (f.cargas * p) / 100;
      })
    );
    return t;
  }, [filas, centros]);

  const confirmar = async () => {
    if (!periodo) return;
    if (invalidas.length) return toast.error(`Hay ${invalidas.length} empleados cuyos % no suman 100`);
    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("distribucion_costos_empleado").delete().eq("periodo", periodo.id);
      const rows = filas.flatMap((f) =>
        Object.entries(f.pct)
          .filter(([, p]) => Number(p) > 0)
          .map(([c, p]) => ({
            periodo: periodo.id,
            empleado_id: f.empleado_id,
            centro_costo_id: c,
            horas: f.horas[c] || 0,
            porcentaje: Number(p),
            origen: f.origen === "sin_datos" ? "manual" : f.origen,
            confirmado_por: user?.id,
          }))
      );
      if (rows.length) {
        const { error } = await (supabase as any).from("distribucion_costos_empleado").insert(rows);
        if (error) throw error;
      }
      toast.success("Distribución confirmada para el período");
      qc.invalidateQueries({ queryKey: ["distribucion_costos"] });
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const exportar = () => {
    if (!centros) return;
    const detalle = filas.map((f) => {
      const row: any = { Empleado: f.nombre, Origen: f.origen, "Sueldo bruto": f.bruto, "Cargas sociales": f.cargas, "Horas sin ubicación": f.sinUbicacion };
      centros.forEach((c) => {
        row[`${c.nombre} horas`] = f.horas[c.id] || 0;
        row[`${c.nombre} %`] = f.pct[c.id] || 0;
        row[`${c.nombre} costo`] = Math.round(((f.bruto + f.cargas) * (f.pct[c.id] || 0)) / 100);
      });
      return row;
    });
    const resumen = centros.map((c) => ({
      "Centro de costo": c.nombre,
      Horas: totales[c.id]?.horas || 0,
      "Sueldos": Math.round(totales[c.id]?.bruto || 0),
      "Cargas sociales": Math.round(totales[c.id]?.cargas || 0),
      Total: Math.round((totales[c.id]?.bruto || 0) + (totales[c.id]?.cargas || 0)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle");
    XLSX.writeFile(wb, `distribucion_costos_${periodo?.id}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Distribución de sueldos por centro de costo</CardTitle>
          <CardDescription>
            Calcula el % de cada empleado en cada centro según dónde fichó (GPS). Podés ajustar a mano o fijar un centro (ej. Administración) y confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Select value={periodoId || undefined} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Elegí el período" /></SelectTrigger>
            <SelectContent>
              {periodos?.map((p) => <SelectItem key={p.id} value={p.id}>{p.id}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={calcular} disabled={!periodo || calculando}>
            <Calculator className="h-4 w-4 mr-1" /> {calculando ? "Calculando..." : "Calcular"}
          </Button>
          <Button variant="outline" onClick={exportar} disabled={!filas.length}><Download className="h-4 w-4 mr-1" /> Excel</Button>
          <Button variant="secondary" onClick={confirmar} disabled={!filas.length || guardando}>
            <Save className="h-4 w-4 mr-1" /> {guardando ? "Guardando..." : "Confirmar distribución"}
          </Button>
          {!periodos?.length && <p className="text-sm text-muted-foreground">Primero creá un período en la pestaña Períodos.</p>}
        </CardContent>
      </Card>

      {filas.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {centros?.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 space-y-1">
                  <p className="text-sm font-medium">{c.nombre}</p>
                  <p className="text-2xl font-bold">{fmt((totales[c.id]?.bruto || 0) + (totales[c.id]?.cargas || 0))}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(totales[c.id]?.horas || 0)} h · Sueldos {fmt(totales[c.id]?.bruto || 0)} · Cargas {fmt(totales[c.id]?.cargas || 0)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {invalidas.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {invalidas.length} empleados tienen porcentajes que no suman 100%.
            </div>
          )}

          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    {centros?.map((c) => <TableHead key={c.id} className="text-center">{c.nombre}</TableHead>)}
                    <TableHead>Total %</TableHead>
                    <TableHead>Sin ubicación</TableHead>
                    <TableHead>Centro fijo</TableHead>
                    <TableHead>Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.map((f) => {
                    const suma = sumaPct(f);
                    const fijo = fijos?.find((x) => x.empleado_id === f.empleado_id)?.centro_costo_id;
                    return (
                      <TableRow key={f.empleado_id}>
                        <TableCell className="font-medium whitespace-nowrap">{f.nombre}</TableCell>
                        {centros?.map((c) => (
                          <TableCell key={c.id} className="text-center">
                            <Input
                              type="number"
                              className="h-8 w-20 mx-auto text-right"
                              value={f.pct[c.id] ?? 0}
                              onChange={(e) => setPct(f.empleado_id, c.id, Number(e.target.value))}
                            />
                            <span className="text-[10px] text-muted-foreground">{(f.horas[c.id] || 0).toFixed(1)} h</span>
                          </TableCell>
                        ))}
                        <TableCell className={Math.abs(suma - 100) > 0.5 ? "text-destructive font-semibold" : ""}>{suma.toFixed(1)}%</TableCell>
                        <TableCell>{f.sinUbicacion > 0 ? `${f.sinUbicacion.toFixed(1)} h` : "—"}</TableCell>
                        <TableCell>
                          <Select value={fijo || "none"} onValueChange={(v) => setFijo(f.empleado_id, v)}>
                            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Según fichadas</SelectItem>
                              {centros?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Badge variant="outline">{f.origen === "sin_datos" ? "Sin datos" : f.origen}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
