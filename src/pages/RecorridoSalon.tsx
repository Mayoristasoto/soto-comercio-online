import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Map as MapIcon, Plus, Trash2, Settings2, LayoutGrid, AlertTriangle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { HallazgosAbiertos } from "@/components/recorrido/HallazgosAbiertos";
import {
  TIPO_ESPACIO_LABEL,
  type Recorrido,
  type RecorridoCriterio,
  type RecorridoPlano,
  type TipoEspacio,
} from "@/components/recorrido/recorridoTypes";
import { EspaciosEditor } from "@/components/recorrido/EspaciosEditor";
import { fondoDe } from "@/components/recorrido/planosFondo";
import GondolasEditV2 from "@/pages/GondolasEditV2";
import { cargarGondolasV2, gondolaAPorcentaje } from "@/components/recorrido/FondoGondolasV2";

interface Sucursal { id: string; nombre: string }
interface Empleado { id: string; nombre: string; apellido: string; sucursal_id?: string | null }

const RecorridoSalon = () => {
  const navigate = useNavigate();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [recorridos, setRecorridos] = useState<(Recorrido & { sucursal_nombre?: string })[]>([]);
  const [planos, setPlanos] = useState<RecorridoPlano[]>([]);
  const [criterios, setCriterios] = useState<RecorridoCriterio[]>([]);
  const [sucursalSel, setSucursalSel] = useState<string>("");

  // nuevo recorrido
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevaSucursal, setNuevaSucursal] = useState("");
  const [nuevoResponsable, setNuevoResponsable] = useState("none");
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  // nuevo criterio
  const [nuevoCriterio, setNuevoCriterio] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [regenerando, setRegenerando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: (await supabase.auth.getUser()).data.user?.id ?? "", _role: "admin_rrhh" });
      setEsAdmin(Boolean(data));
    })();
  }, []);

  const cargarBase = async () => {
    const [{ data: suc }, { data: emp }, { data: cri }] = await Promise.all([
      supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
      supabase.from("empleados").select("id, nombre, apellido, sucursal_id").eq("activo", true).order("apellido"),
      supabase.from("recorrido_criterios").select("*").order("orden"),
    ]);
    setSucursales((suc as Sucursal[]) ?? []);
    setEmpleados((emp as Empleado[]) ?? []);
    setCriterios((cri as RecorridoCriterio[]) ?? []);
  };

  const cargarRecorridos = async () => {
    const { data } = await supabase.from("recorridos").select("*").order("fecha_hora", { ascending: false }).limit(100);
    const lista = (data as Recorrido[]) ?? [];
    const mapa = new Map(sucursales.map((s) => [s.id, s.nombre]));
    setRecorridos(lista.map((r) => ({ ...r, sucursal_nombre: mapa.get(r.sucursal_id) ?? "-" })));
  };

  const cargarPlanos = async () => {
    const { data } = await supabase.from("recorrido_planos").select("*").eq("activo", true);
    setPlanos((data as RecorridoPlano[]) ?? []);
  };

  useEffect(() => { cargarBase(); cargarPlanos(); }, []);
  useEffect(() => { if (sucursales.length) cargarRecorridos(); }, [sucursales]);

  /** Deja el plano del recorrido igual al mapa de góndolas de la sucursal (un solo set de recuadros) */
  const empezarDeCeroConGondolas = async () => {
    if (!sucursalSel) return toast.error("Elegí primero la sucursal");
    const nombreSuc = sucursales.find((s) => s.id === sucursalSel)?.nombre ?? "Plano";
    setRegenerando(true);
    try {
      const res = await sincronizarEspaciosDesdeGondolas(sucursalSel, nombreSuc);
      if (!res) throw new Error("El mapa de góndolas de esta sucursal está vacío");
      toast.success(`${res.total} espacios listos para controlar en ${nombreSuc}`);
      await cargarPlanos();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo armar el plano");
    } finally {
      setRegenerando(false);
    }
  };

  const crearRecorrido = async () => {
    if (!nuevaSucursal) return toast.error("Elegí la sucursal");
    const plano = planos.find((p) => p.sucursal_id === nuevaSucursal) ?? null;
    const { data, error } = await supabase
      .from("recorridos")
      .insert({
        sucursal_id: nuevaSucursal,
        plano_id: plano?.id ?? null,
        titulo: nuevoTitulo.trim() || null,
        responsable_id: nuevoResponsable === "none" ? null : nuevoResponsable,
      })
      .select("id")
      .single();
    if (error || !data) return toast.error("No se pudo crear el recorrido");
    toast.success("Recorrido creado");
    setNuevoOpen(false);
    navigate(`/rrhh/recorrido/${data.id}`);
  };

  const agregarCriterio = async () => {
    if (!nuevoCriterio.trim()) return;
    const { error } = await supabase.from("recorrido_criterios").insert({
      nombre: nuevoCriterio.trim(),
      orden: criterios.length + 1,
      tipos_aplica: ["gondola"],
    });
    if (error) return toast.error("No se pudo crear el criterio");
    setNuevoCriterio("");
    cargarBase();
  };

  const toggleCriterio = async (c: RecorridoCriterio) => {
    await supabase.from("recorrido_criterios").update({ activo: !c.activo }).eq("id", c.id);
    cargarBase();
  };

  const borrarCriterio = async (c: RecorridoCriterio) => {
    const { error } = await supabase.from("recorrido_criterios").delete().eq("id", c.id);
    if (error) return toast.error("No se pudo eliminar");
    cargarBase();
  };

  const eliminarRecorrido = async (r: Recorrido) => {
    if (!confirm(`¿Eliminar el recorrido "${r.titulo ?? "sin título"}"?`)) return;
    await supabase.from("recorrido_hallazgos").delete().eq("recorrido_id", r.id);
    const { error } = await supabase.from("recorridos").delete().eq("id", r.id);
    if (error) return toast.error("No se pudo eliminar");
    cargarRecorridos();
  };

  const planoActual = useMemo(() => planos.find((p) => p.sucursal_id === sucursalSel) ?? null, [planos, sucursalSel]);

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapIcon className="h-6 w-6" /> Recorrido de Salón</h1>
          <p className="text-sm text-muted-foreground">Recorré el plano pasillo por pasillo y evaluá criterios como limpieza, precios y rotación.</p>
        </div>
        <Button onClick={() => setNuevoOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nuevo recorrido</Button>
      </div>

      <Tabs defaultValue="recorridos">
        <TabsList>
          <TabsTrigger value="recorridos">Recorridos</TabsTrigger>
          <TabsTrigger value="plano"><Settings2 className="h-4 w-4 mr-1" /> Góndolas</TabsTrigger>
          <TabsTrigger value="hallazgos"><AlertTriangle className="h-4 w-4 mr-1" /> Hallazgos</TabsTrigger>
          <TabsTrigger value="criterios">Criterios</TabsTrigger>
          <TabsTrigger value="editor"><LayoutGrid className="h-4 w-4 mr-1" /> Editor de layout</TabsTrigger>
        </TabsList>

        <TabsContent value="recorridos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recorridos.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin recorridos todavía</TableCell></TableRow>
                  )}
                  {recorridos.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/rrhh/recorrido/${r.id}`)}>
                      <TableCell>{new Date(r.fecha_hora).toLocaleString("es-AR")}</TableCell>
                      <TableCell>{r.titulo ?? "Recorrido"}</TableCell>
                      <TableCell>{r.sucursal_nombre}</TableCell>
                      <TableCell>
                        <Badge variant={r.estado === "completado" ? "default" : "secondary"}>
                          {r.estado === "completado" ? "Completado" : "En curso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); eliminarRecorrido(r); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Góndolas por sucursal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={sucursalSel || undefined} onValueChange={setSucursalSel}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Elegir sucursal" /></SelectTrigger>
                  <SelectContent>
                    {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {sucursalSel && (
                  <Button variant="secondary" onClick={empezarDeCeroConGondolas} disabled={regenerando}>
                    <Wand2 className="h-4 w-4 mr-1" />
                    {regenerando ? "Preparando…" : "Preparar controles"}
                  </Button>
                )}
              </div>
              {sucursalSel && (
                <div className="border-t pt-4">
                  <EspaciosEditor sucursalId={sucursalSel} onChange={() => cargarPlanos()} />
                </div>
              )}
              {!sucursalSel && <p className="text-sm text-muted-foreground">Elegí una sucursal para ver sus góndolas.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallazgos">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Hallazgos detectados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HallazgosAbiertos sucursales={sucursales} empleados={empleados.map((e) => ({ ...e, sucursal_id: e.sucursal_id ?? null }))} esAdmin={esAdmin} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criterios">
          <Card>
            <CardHeader><CardTitle className="text-base">Criterios a evaluar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={nuevoCriterio} onChange={(e) => setNuevoCriterio(e.target.value)} placeholder="Ej: Orden de góndola" />
                <Button onClick={agregarCriterio}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Criterio</TableHead><TableHead>Descripción</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow>
                </TableHeader>
                <TableBody>
                  {criterios.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{c.descripcion}</TableCell>
                      <TableCell>
                        <Button size="sm" variant={c.activo ? "default" : "outline"} onClick={() => toggleCriterio(c)}>
                          {c.activo ? "Activo" : "Inactivo"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => borrarCriterio(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Editor del layout (copia independiente)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <GondolasEditV2 embedded />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo recorrido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Título (opcional), ej: Recorrido mañana" />
            <Select value={nuevaSucursal || undefined} onValueChange={setNuevaSucursal}>
              <SelectTrigger><SelectValue placeholder="Sucursal" /></SelectTrigger>
              <SelectContent>
                {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={nuevoResponsable} onValueChange={setNuevoResponsable}>
              <SelectTrigger><SelectValue placeholder="Responsable (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin responsable</SelectItem>
                {empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={crearRecorrido}>Comenzar recorrido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecorridoSalon;
