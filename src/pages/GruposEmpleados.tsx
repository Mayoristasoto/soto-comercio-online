import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Copy, Users, Layers, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  GrupoEmpleados,
  TipoGrupo,
  FiltrosDinamicos,
  MODULOS_DISPONIBLES,
  listarGrupos,
  guardarGrupo,
  eliminarGrupo,
  resolverGrupo,
} from "@/lib/gruposEmpleados";

interface Empleado { id: string; nombre: string; apellido: string; puesto: string | null; sucursal_id: string | null; activo: boolean; }
interface Sucursal { id: string; nombre: string; }

const EMPTY: Partial<GrupoEmpleados> = {
  nombre: "",
  descripcion: "",
  color: "#4b0d6d",
  tipo: "manual",
  empleado_ids: [],
  filtros: { solo_activos: true },
  compartido: true,
  modulos_sugeridos: [],
};

export default function GruposEmpleados() {
  const [grupos, setGrupos] = useState<GrupoEmpleados[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [puestos, setPuestos] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Partial<GrupoEmpleados> | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [g, e, s] = await Promise.all([
      listarGrupos(),
      supabase.from("empleados").select("id,nombre,apellido,puesto,sucursal_id,activo").order("apellido"),
      supabase.from("sucursales").select("id,nombre").order("nombre"),
    ]);
    setGrupos(g);
    const emps = (e.data || []) as Empleado[];
    setEmpleados(emps);
    setSucursales((s.data || []) as Sucursal[]);
    const ps = Array.from(new Set(emps.map(x => x.puesto).filter(Boolean))) as string[];
    setPuestos(ps.sort());
    // resolver counts
    const cs: Record<string, number> = {};
    for (const grp of g) {
      cs[grp.id] = grp.tipo === "manual" ? (grp.empleado_ids?.length || 0) : 0;
    }
    setCounts(cs);
    // counts dinámicos en paralelo
    g.filter(x => x.tipo === "dinamico").forEach(async (grp) => {
      try {
        const ids = await resolverGrupo(grp.id);
        setCounts(prev => ({ ...prev, [grp.id]: ids.length }));
      } catch {}
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSave = async () => {
    if (!editing?.nombre?.trim()) { toast.error("Nombre requerido"); return; }
    try {
      await guardarGrupo(editing as any);
      toast.success("Grupo guardado");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar este grupo?")) return;
    try { await eliminarGrupo(id); toast.success("Eliminado"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const duplicar = (g: GrupoEmpleados) => {
    setEditing({ ...g, id: undefined, nombre: `${g.nombre} (copia)` });
  };

  const filtered = grupos.filter(g => !search || g.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Grupos de Empleados
          </h1>
          <p className="text-sm text-muted-foreground">
            Grupos editables reutilizables en todos los módulos: nómina, vacaciones, fichero, informes, tareas y más.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo grupo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Grupos guardados</CardTitle>
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No hay grupos. Creá el primero con "Nuevo grupo".</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Módulos sugeridos</TableHead>
                  <TableHead>Compartido</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(g => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: g.color || "#4b0d6d" }} />
                        <div>
                          <div className="font-medium">{g.nombre}</div>
                          {g.descripcion && <div className="text-xs text-muted-foreground">{g.descripcion}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.tipo === "dinamico" ? "default" : "secondary"}>
                        {g.tipo === "dinamico" ? <><Filter className="h-3 w-3 mr-1" />Dinámico</> : <><Users className="h-3 w-3 mr-1" />Manual</>}
                      </Badge>
                    </TableCell>
                    <TableCell>{counts[g.id] ?? "…"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(g.modulos_sugeridos || []).map(m => (
                          <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{g.compartido ? "Sí" : "Privado"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(g)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => duplicar(g)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(g.id)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar grupo" : "Nuevo grupo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={editing.nombre || ""} onChange={e => setEditing({ ...editing, nombre: e.target.value })} />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input type="color" value={editing.color || "#4b0d6d"} onChange={e => setEditing({ ...editing, color: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={editing.descripcion || ""} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} rows={2} />
              </div>

              <div>
                <Label>Módulos sugeridos</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {MODULOS_DISPONIBLES.map(m => {
                    const active = (editing.modulos_sugeridos || []).includes(m.value);
                    return (
                      <Badge
                        key={m.value}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const set = new Set(editing.modulos_sugeridos || []);
                          if (active) set.delete(m.value); else set.add(m.value);
                          setEditing({ ...editing, modulos_sugeridos: Array.from(set) });
                        }}
                      >
                        {m.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.compartido ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, compartido: v })}
                />
                <Label>Compartido con todos los administradores</Label>
              </div>

              <Tabs value={editing.tipo || "manual"} onValueChange={(t) => setEditing({ ...editing, tipo: t as TipoGrupo })}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="manual"><Users className="h-3 w-3 mr-1" />Lista manual</TabsTrigger>
                  <TabsTrigger value="dinamico"><Filter className="h-3 w-3 mr-1" />Filtro dinámico</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-2">
                  <p className="text-xs text-muted-foreground">Lista fija de empleados. Hay que editarla manualmente cuando cambie.</p>
                  <Input placeholder="Buscar empleado..." onChange={e => setSearch(e.target.value)} value={search} />
                  <div className="flex gap-2 text-xs">
                    <Button size="sm" variant="outline" type="button" onClick={() => setEditing({ ...editing, empleado_ids: empleados.map(e => e.id) })}>
                      Todos
                    </Button>
                    <Button size="sm" variant="outline" type="button" onClick={() => setEditing({ ...editing, empleado_ids: [] })}>
                      Limpiar
                    </Button>
                    <Badge variant="secondary">{(editing.empleado_ids || []).length} seleccionados</Badge>
                  </div>
                  <div className="max-h-72 overflow-auto border rounded-md divide-y">
                    {empleados
                      .filter(e => !search || `${e.apellido} ${e.nombre}`.toLowerCase().includes(search.toLowerCase()))
                      .slice(0, 100)
                      .map(e => {
                        const checked = (editing.empleado_ids || []).includes(e.id);
                        return (
                          <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const ids = new Set(editing.empleado_ids || []);
                                if (checked) ids.delete(e.id); else ids.add(e.id);
                                setEditing({ ...editing, empleado_ids: Array.from(ids) });
                              }}
                            />
                            <span className="flex-1">{e.apellido}, {e.nombre}</span>
                            {e.puesto && <span className="text-xs text-muted-foreground">{e.puesto}</span>}
                          </label>
                        );
                      })}
                  </div>
                </TabsContent>

                <TabsContent value="dinamico" className="space-y-3">
                  <p className="text-xs text-muted-foreground">El grupo se recalcula automáticamente cada vez que se usa, según estos filtros.</p>

                  <div>
                    <Label>Sucursales</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {sucursales.map(s => {
                        const arr = (editing.filtros?.sucursal_ids || []) as string[];
                        const active = arr.includes(s.id);
                        return (
                          <Badge
                            key={s.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const set = new Set(arr);
                              if (active) set.delete(s.id); else set.add(s.id);
                              setEditing({ ...editing, filtros: { ...(editing.filtros || {}), sucursal_ids: Array.from(set) } });
                            }}
                          >
                            {s.nombre}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Puestos</Label>
                    <div className="flex flex-wrap gap-2 mt-1 max-h-40 overflow-auto">
                      {puestos.map(p => {
                        const arr = (editing.filtros?.puestos || []) as string[];
                        const active = arr.includes(p);
                        return (
                          <Badge
                            key={p}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const set = new Set(arr);
                              if (active) set.delete(p); else set.add(p);
                              setEditing({ ...editing, filtros: { ...(editing.filtros || {}), puestos: Array.from(set) } });
                            }}
                          >
                            {p}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editing.filtros?.solo_activos ?? true}
                      onCheckedChange={(v) => setEditing({ ...editing, filtros: { ...(editing.filtros || {}), solo_activos: v } })}
                    />
                    <Label>Solo empleados activos</Label>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={onSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
