import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Loader2, Plus, Search, LayoutList } from "lucide-react";
import { formatArgentinaDateTime } from "@/lib/dateUtils";
import { NuevoControlDialog } from "@/components/checklist/NuevoControlDialog";
import { ResumenChecklist } from "@/components/checklist/ResumenChecklist";
import type { ChecklistEstadoItem } from "@/components/checklist/checklistTypes";

interface ControlRow {
  id: string;
  titulo: string | null;
  fecha_hora: string;
  estado: string;
  sucursal_id: string;
  sucursal_nombre: string | null;
  items: { estado: ChecklistEstadoItem | null }[];
}

const TODAS = "todas";

export default function ChecklistControles() {
  const [controles, setControles] = useState<ControlRow[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [filtroSucursal, setFiltroSucursal] = useState(TODAS);
  const [filtroEstado, setFiltroEstado] = useState(TODAS);
  const [busqueda, setBusqueda] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      const suc = await db.from("sucursales").select("id, nombre").order("nombre");
      setSucursales(suc.data || []);

      const { data } = await db
        .from("checklist_controles")
        .select("id, titulo, fecha_hora, estado, sucursal_id, checklist_control_items(estado)")
        .order("fecha_hora", { ascending: false })
        .limit(300);

      const mapSuc = new Map<string, string>((suc.data || []).map((s: any) => [s.id, s.nombre]));
      setControles(
        (data || []).map((c: any) => ({
          id: c.id,
          titulo: c.titulo,
          fecha_hora: c.fecha_hora,
          estado: c.estado,
          sucursal_id: c.sucursal_id,
          sucursal_nombre: mapSuc.get(c.sucursal_id) ?? null,
          items: c.checklist_control_items || [],
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(
    () =>
      controles.filter((c) => {
        if (filtroSucursal !== TODAS && c.sucursal_id !== filtroSucursal) return false;
        if (filtroEstado !== TODAS && c.estado !== filtroEstado) return false;
        if (busqueda.trim()) {
          const t = `${c.titulo ?? ""} ${c.sucursal_nombre ?? ""}`.toLowerCase();
          if (!t.includes(busqueda.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [controles, filtroSucursal, filtroEstado, busqueda]
  );

  const itemsTotales = filtrados.flatMap((c) => c.items);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Checklist de Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Controles por sucursal con estados, observaciones y evidencia fotográfica.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/rrhh/checklist/plantillas">
              <LayoutList className="mr-2 h-4 w-4" />
              Plantillas
            </Link>
          </Button>
          <Button onClick={() => setNuevoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo control
          </Button>
        </div>
      </header>

      <ResumenChecklist items={itemsTotales} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de controles</CardTitle>
          <CardDescription>{filtrados.length} control(es)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Sucursal</Label>
              <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todos</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Título o sucursal"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay controles para estos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y hora</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Resumen</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatArgentinaDateTime(c.fecha_hora)}
                      </TableCell>
                      <TableCell className="text-sm">{c.sucursal_nombre ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.titulo ?? "Control"}</TableCell>
                      <TableCell>
                        <ResumenChecklist items={c.items} compacto />
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.estado === "cerrado" ? "secondary" : "outline"}>
                          {c.estado === "cerrado" ? "Cerrado" : "Borrador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/rrhh/checklist/${c.id}`}>Abrir</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NuevoControlDialog
        open={nuevoOpen}
        onOpenChange={(v) => {
          setNuevoOpen(v);
          if (!v) cargar();
        }}
      />
    </div>
  );
}
