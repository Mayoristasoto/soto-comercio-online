import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Plus, Search } from "lucide-react";
import { CargaManualVacacionesDialog } from "./CargaManualVacacionesDialog";

// Patrones de exclusión para empleados de prueba / familia Soto (no influyen en gestión de vacaciones)
const PATRONES_EXCLUSION = {
  contiene: ["demo", "dwaddw", "dwadad", "test", "prueba"], // en nombre o apellido
  apellidoExacto: ["soto"],
};

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
  antiguedad_anios: number;
  antiguedad_meses: number;
  dias_segun_ley: number;
  dias_usados: number;
  dias_faltantes: number;
  tiene_calculo: boolean;
}

function esEmpleadoExcluido(nombre: string, apellido: string): boolean {
  const n = (nombre ?? "").toLowerCase().trim();
  const a = (apellido ?? "").toLowerCase().trim();
  if (PATRONES_EXCLUSION.apellidoExacto.includes(a)) return true;
  for (const p of PATRONES_EXCLUSION.contiene) {
    if (n.includes(p) || a.includes(p)) return true;
  }
  return false;
}

function formatAntiguedad(anios: number, meses: number) {
  if (!anios && !meses) return "—";
  return `${anios}a ${meses}m`;
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
  const [excluirPrueba, setExcluirPrueba] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empleadoPreseleccionado, setEmpleadoPreseleccionado] = useState<EmpleadoRow | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [empRes, sucRes, puestoRes, calcRes] = await Promise.all([
        supabase
          .from("empleados")
          .select("id, nombre, apellido, dni, fecha_ingreso, sucursal_id, puesto_id")
          .eq("activo", true)
          .order("apellido", { ascending: true }),
        supabase.from("sucursales").select("id, nombre"),
        supabase.from("puestos").select("id, nombre"),
        supabase.rpc("obtener_calculo_vacaciones_todos", { p_anio: anioActual }),
      ]);

      if (empRes.error) throw empRes.error;
      if (calcRes.error) throw calcRes.error;

      const sucMap = new Map((sucRes.data ?? []).map((s: any) => [s.id, s.nombre]));
      const puestoMap = new Map((puestoRes.data ?? []).map((p: any) => [p.id, p.nombre]));
      const calcMap = new Map(
        (calcRes.data ?? []).map((c: any) => [c.empleado_id, c])
      );

      const conFaltantes: EmpleadoRow[] = (empRes.data ?? [])
        .map((e: any) => {
          const c: any = calcMap.get(e.id);
          const dias_segun_ley = Number(c?.dias_segun_ley ?? 0);
          const dias_usados = Number(c?.dias_usados ?? 0);
          const dias_faltantes = Math.max(0, dias_segun_ley - dias_usados);
          return {
            id: e.id,
            nombre: e.nombre,
            apellido: e.apellido,
            dni: e.dni,
            fecha_ingreso: e.fecha_ingreso,
            sucursal_id: e.sucursal_id,
            puesto_id: e.puesto_id,
            sucursal_nombre: sucMap.get(e.sucursal_id) ?? "—",
            puesto_nombre: puestoMap.get(e.puesto_id) ?? "—",
            antiguedad_anios: Number(c?.antiguedad_anios ?? 0),
            antiguedad_meses: Number(c?.antiguedad_meses ?? 0),
            dias_segun_ley,
            dias_usados,
            dias_faltantes,
            tiene_calculo: !!c && !!e.fecha_ingreso,
          };
        })
        .filter((r: EmpleadoRow) => r.dias_faltantes > 0);

      setRows(conFaltantes);
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
    return rows
      .filter((r) => {
        if (excluirPrueba && esEmpleadoExcluido(r.nombre, r.apellido)) return false;
        if (filtroSucursal !== "todas" && r.sucursal_id !== filtroSucursal) return false;
        if (filtroPuesto !== "todos" && r.puesto_id !== filtroPuesto) return false;
        if (q) {
          const hay = `${r.nombre} ${r.apellido} ${r.dni ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.dias_faltantes - a.dias_faltantes);
  }, [rows, filtroSucursal, filtroPuesto, busqueda, excluirPrueba]);

  const exportarCSV = () => {
    const headers = [
      "Apellido",
      "Nombre",
      "DNI",
      "Sucursal",
      "Puesto",
      "Fecha ingreso",
      "Antigüedad años",
      "Antigüedad meses",
      "Días LCT",
      "Días usados",
      "Días faltantes",
    ];
    const lineas = filtrados.map((r) =>
      [
        r.apellido,
        r.nombre,
        r.dni ?? "",
        r.sucursal_nombre,
        r.puesto_nombre,
        r.fecha_ingreso ?? "",
        r.antiguedad_anios,
        r.antiguedad_meses,
        r.dias_segun_ley,
        r.dias_usados,
        r.dias_faltantes,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lineas].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `empleados-vacaciones-pendientes-${anioActual}.csv`;
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

        <div className="flex items-center gap-2 px-1">
          <Switch
            id="excluir-prueba"
            checked={excluirPrueba}
            onCheckedChange={setExcluirPrueba}
          />
          <Label htmlFor="excluir-prueba" className="text-sm text-muted-foreground cursor-pointer">
            Excluir empleados de prueba y familia Soto (no influyen en gestión de vacaciones)
          </Label>
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
                  <TableHead>Antigüedad</TableHead>
                  <TableHead className="text-center">Días LCT</TableHead>
                  <TableHead className="text-center">Días faltantes</TableHead>
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
                    <TableCell>
                      {r.tiene_calculo
                        ? formatAntiguedad(r.antiguedad_anios, r.antiguedad_meses)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {r.tiene_calculo ? r.dias_segun_ley : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {!r.tiene_calculo ? (
                        <span className="text-muted-foreground">—</span>
                      ) : r.dias_faltantes > 0 ? (
                        <Badge variant="destructive">{r.dias_faltantes}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
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
