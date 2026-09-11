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
import { Map as MapIcon, Plus, Upload, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ZonaEditor } from "@/components/recorrido/ZonaEditor";
import { PlanoCanvas } from "@/components/recorrido/PlanoCanvas";
import { BUCKET_PLANOS, type Recorrido, type RecorridoCriterio, type RecorridoPlano, type RecorridoZona } from "@/components/recorrido/recorridoTypes";

interface Sucursal { id: string; nombre: string }
interface Empleado { id: string; nombre: string; apellido: string }

const RecorridoSalon = () => {
  const navigate = useNavigate();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [recorridos, setRecorridos] = useState<(Recorrido & { sucursal_nombre?: string })[]>([]);
  const [planos, setPlanos] = useState<RecorridoPlano[]>([]);
  const [zonas, setZonas] = useState<RecorridoZona[]>([]);
  const [criterios, setCriterios] = useState<RecorridoCriterio[]>([]);
  const [sucursalSel, setSucursalSel] = useState<string>("");
  const [planoSel, setPlanoSel] = useState<RecorridoPlano | null>(null);

  // nuevo recorrido
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevaSucursal, setNuevaSucursal] = useState("");
  const [nuevoResponsable, setNuevoResponsable] = useState("none");
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  // nuevo criterio
  const [nuevoCriterio, setNuevoCriterio] = useState("");

  const cargarBase = async () => {
    const [{ data: suc }, { data: emp }, { data: cri }] = await Promise.all([
      supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
      supabase.from("empleados").select("id, nombre, apellido").eq("activo", true).order("apellido"),
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

  const cargarZonas = async (planoId: string) => {
    const { data } = await supabase.from("recorrido_zonas").select("*").eq("plano_id", planoId).order("orden");
    setZonas((data as RecorridoZona[]) ?? []);
  };

  useEffect(() => { cargarBase(); cargarPlanos(); }, []);
  useEffect(() => { if (sucursales.length) cargarRecorridos(); }, [sucursales]);
  useEffect(() => {
    const p = planos.find((x) => x.sucursal_id === sucursalSel) ?? null;
    setPlanoSel(p);
    if (p) cargarZonas(p.id);
    else setZonas([]);
  }, [sucursalSel, planos]);

  const subirPlano = async (file: File) => {
    if (!sucursalSel) return toast.error("Elegí primero la sucursal");
    try {
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const img = new Image();
        img.onload = () => { res({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(img.src); };
        img.onerror = () => res({ w: 1000, h: 700 });
        img.src = URL.createObjectURL(file);
      });
      const path = `${sucursalSel}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from(BUCKET_PLANOS).upload(path, file);
      if (upErr) throw upErr;
      const existente = planos.find((p) => p.sucursal_id === sucursalSel);
      const nombreSuc = sucursales.find((s) => s.id === sucursalSel)?.nombre ?? "Plano";
      if (existente) {
        await supabase.from("recorrido_planos").update({ imagen_path: path, ancho: dims.w, alto: dims.h }).eq("id", existente.id);
      } else {
        await supabase.from("recorrido_planos").insert({ sucursal_id: sucursalSel, nombre: `Plano ${nombreSuc}`, ancho: dims.w, alto: dims.h, imagen_path: path });
      }
      toast.success("Imagen del plano guardada");
      cargarPlanos();
    } catch {
      toast.error("No se pudo subir la imagen");
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
    const { error } = await supabase.from("recorrido_criterios").insert({ nombre: nuevoCriterio.trim(), orden: criterios.length + 1 });
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="h-6 w-6" /> Recorrido de Salón</h1>
          <p className="text-sm text-muted-foreground">Recorré el plano pasillo por pasillo y evaluá criterios como limpieza, precios y rotación.</p>
        </div>
        <Button onClick={() => setNuevoOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nuevo recorrido</Button>
      </div>

      <Tabs defaultValue="recorridos">
        <TabsList>
          <TabsTrigger value="recorridos">Recorridos</TabsTrigger>
          <TabsTrigger value="plano"><Settings2 className="h-4 w-4 mr-1" /> Plano y zonas</TabsTrigger>
          <TabsTrigger value="criterios">Criterios</TabsTrigger>
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
              <CardTitle className="text-base">Plano de referencia por sucursal</CardTitle>
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
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && subirPlano(e.target.files[0])}
                    />
                    <Button variant="outline" asChild>
                      <span><Upload className="h-4 w-4 mr-1" /> {planoActual?.imagen_path ? "Reemplazar imagen" : "Subir imagen del plano"}</span>
                    </Button>
                  </label>
                )}
              </div>
              {planoActual && (
                <>
                  <PlanoCanvas plano={planoActual} zonas={zonas} />
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Definir pasillos / zonas</h3>
                    <ZonaEditor plano={planoActual} zonas={zonas} onZonasChange={() => cargarZonas(planoActual.id)} />
                  </div>
                </>
              )}
              {sucursalSel && !planoActual && (
                <p className="text-sm text-muted-foreground">Subí la imagen del plano para poder marcar las zonas.</p>
              )}
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
