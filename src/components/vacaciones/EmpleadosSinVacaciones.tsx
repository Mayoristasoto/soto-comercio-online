import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Plus, Search } from "lucide-react";
import { CargaManualVacacionesDialog } from "./CargaManualVacacionesDialog";

interface EmpleadoRow {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_ingreso: string | null;
  sucursal_id: string | null;
  puesto_id: string | null;
  sucursal_nombre: string;
  puesto_nombre: string;
  dias_disponibles: number | null;
}

export function EmpleadosSinVacaciones() {
  const { toast } = useToast();
  const anioActual = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EmpleadoRow[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [puestos, setPuestos] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
  const [filtroPuesto, setFiltroPuesto] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empleadoPreseleccionado, setEmpleadoPreseleccionado] = useState<EmpleadoRow | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const desde = `${anioActual}-01-01`;
      const hasta = `${anioActual}-12-31`;

      const [empRes, solRes, sucRes, puestoRes, saldoRes] = await Promise.all([
        supabase
          .from("empleados")
          .select("id, nombre, apellido, dni, fecha_ingreso, sucursal_id, puesto_id")
          .eq("activo", true)
          .order("apellido", { ascending: true }),
        supabase
          .from("solicitudes_vacaciones")
          .select("empleado_id")
          .gte("fecha_inicio", desde)
          .lte("fecha_inicio", hasta),
        supabase.from("sucursales").select("id, nombre"),
        supabase.from("puestos").select("id, nombre"),
        supabase
          .from("vacaciones_saldo")
          .select("empleado_id, dias_pendientes, dias_acumulados, dias_usados")
          .eq("anio", anioActual),
      ]);

      if (empRes.error) throw empRes.error;
      if (solRes.error) throw solRes.error;

      const empleadosConSolicitud = new Set(
        (solRes.data ?? []).map((s: any) => s.empleado_id)
      );
      const sucMap = new Map((sucRes.data ?? []).map((s: any) => [s.id, s.nombre]));
      const puestoMap = new Map((puestoRes.data ?? []).map((p: any) => [p.id, p.nombre]));
      const saldoMap = new Map(
        (saldoRes.data ?? []).map((s: any) => [
          s.empleado_id,
          (s.dias_pendientes ?? (s.dias_acumulados ?? 0) - (s.dias_usados ?? 0)),
        ])
      );

      const sinCargar: EmpleadoRow[] = (empRes.data ?? [])
        .filter((e: any) => !empleadosConSolicitud.has(e.id))
        .map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          apellido: e.apellido,
          dni: e.dni,
          fecha_ingreso: e.fecha_ingreso,
          sucursal_id: e.sucursal_id,
          puesto_id: e.puesto_id,
          sucursal_nombre: sucMap.get(e.sucursal_id) ?? "—",
          puesto_nombre: puestoMap.get(e.puesto_id) ?? "—",
          dias_disponibles: saldoMap.has(e.id) ? Number(saldoMap.get(e.id)) : null,
        }));

      setRows(sinCargar);
      setSucursales((sucRes.data ?? []) as any);
      setPuestos((puestoRes.data ?? []) as any);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((r) => {
      if (filtroSucursal !== "todas" && r.sucursal_id !== filtroSucursal) return false;
      if (filtroPuesto !== "todos" && r.puesto_id !== filtroPuesto) return false;
      if (q) {
        const hay = `${r.nombre} ${r.apellido} ${r.dni ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filtroSucursal, filtroPuesto, busqueda]);

  const exportarCSV = () => {
    const headers = ["Apellido", "Nombre", "DNI", "Sucursal", "Puesto", "Fecha ingreso", "Días disponibles"];
    const lineas = filtrados.map((r) =>
      [
        r.apellido,
        r.nombre,
        r.dni ?? "",
        r.sucursal_nombre,
        r.puesto_nombre,
        r.fecha_ingreso ?? "",
        r.dias_disponibles ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lineas].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `empleados-sin-vacaciones-${anioActual}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const abrirCarga = (emp: EmpleadoRow) => {
    setEmpleadoPreseleccionado(emp);
    setDialogOpen(true);
  };

  const empleadosParaDialog = empleadoPreseleccionado
    ? [{
        id: empleadoPreseleccionado.id,
        nombre: empleadoPreseleccionado.nombre,
        apellido: empleadoPreseleccionado.apellido,
        dni: empleadoPreseleccionado.dni,
      }]
    : rows.map((r) => ({ id: r.id, nombre: r.nombre, apellido: r.apellido, dni: r.dni }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Empleados sin vacaciones cargadas</CardTitle>
            <CardDescription>
              {loading
                ? "Cargando..."
                : `${filtrados.length} empleado${filtrados.length === 1 ? "" : "s"} sin solicitudes en ${anioActual}`}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={exportarCSV} disabled={loading || filtrados.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellido o DNI"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
            <SelectTrigger><SelectValue placeholder="Sucursal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las sucursales</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
            <SelectTrigger><SelectValue placeholder="Puesto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los puestos</SelectItem>
              {puestos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {rows.length === 0
              ? `🎉 Todos los empleados tienen al menos una solicitud cargada en ${anioActual}.`
              : "No hay empleados que coincidan con los filtros."}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead className="text-center">Días disponibles</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.apellido}, {r.nombre}</TableCell>
                    <TableCell>{r.dni ?? "—"}</TableCell>
                    <TableCell>{r.sucursal_nombre}</TableCell>
                    <TableCell>{r.puesto_nombre}</TableCell>
                    <TableCell>{r.fecha_ingreso ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      {r.dias_disponibles === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={r.dias_disponibles > 0 ? "default" : "secondary"}>
                          {r.dias_disponibles}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => abrirCarga(r)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Cargar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <CargaManualVacacionesDialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) setEmpleadoPreseleccionado(null);
          }}
          empleados={empleadosParaDialog}
          onSaved={fetchData}
        />
      </CardContent>
    </Card>
  );
}
