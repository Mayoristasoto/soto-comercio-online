import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Radar, Plus } from "lucide-react";

interface Sucursal { id: string; nombre: string }
interface CentroCosto { id: string; nombre: string; sucursal_id: string | null }

interface Punto {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number;
  longitud: number;
  radio_metros: number | null;
  activa: boolean;
  sucursal_id: string | null;
  centro_costo_id: string | null;
}

interface Cluster {
  lat: number;
  lon: number;
  cantidad: number;
  punto_nombre: string | null;
}

const NONE = "none";

const emptyForm = {
  id: "",
  nombre: "",
  direccion: "",
  latitud: "",
  longitud: "",
  radio_metros: "150",
  activa: true,
  sucursal_id: NONE,
  centro_costo_id: NONE,
};

export function PuntosFichajeManager({ onChanged }: { onChanged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, s, c] = await Promise.all([
      supabase.from("fichado_ubicaciones").select("id,nombre,direccion,latitud,longitud,radio_metros,activa,sucursal_id,centro_costo_id").order("nombre"),
      supabase.from("sucursales").select("id,nombre").eq("activa", true).order("nombre"),
      supabase.from("centros_costo").select("id,nombre,sucursal_id").order("nombre"),
    ]);
    if (p.error) toast.error("No se pudieron cargar los puntos de fichaje");
    setPuntos((p.data as Punto[]) || []);
    setSucursales((s.data as Sucursal[]) || []);
    setCentros((c.data as CentroCosto[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const detectar = async () => {
    setLoadingClusters(true);
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - 90 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase.rpc("get_clusters_fichajes_gps", {
      p_desde: desde.toISOString(),
      p_hasta: hasta.toISOString(),
    });
    if (error) {
      toast.error("No se pudieron detectar ubicaciones: " + error.message);
    } else {
      setClusters(((data as Cluster[]) || []).slice(0, 12));
    }
    setLoadingClusters(false);
  };

  const abrirNuevo = (lat?: number, lon?: number) => {
    setForm({ ...emptyForm, latitud: lat != null ? String(lat) : "", longitud: lon != null ? String(lon) : "" });
    setOpen(true);
  };

  const abrirEditar = (p: Punto) => {
    setForm({
      id: p.id,
      nombre: p.nombre,
      direccion: p.direccion || "",
      latitud: String(p.latitud),
      longitud: String(p.longitud),
      radio_metros: String(p.radio_metros ?? 150),
      activa: p.activa,
      sucursal_id: p.sucursal_id || NONE,
      centro_costo_id: p.centro_costo_id || NONE,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const lat = Number(form.latitud);
    const lon = Number(form.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      toast.error("Coordenadas inválidas");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim() || null,
      latitud: lat,
      longitud: lon,
      radio_metros: Number(form.radio_metros) || 150,
      activa: form.activa,
      sucursal_id: form.sucursal_id === NONE ? null : form.sucursal_id,
      centro_costo_id: form.centro_costo_id === NONE ? null : form.centro_costo_id,
    };
    const { error } = form.id
      ? await supabase.from("fichado_ubicaciones").update(payload).eq("id", form.id)
      : await supabase.from("fichado_ubicaciones").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar: " + error.message);
      return;
    }
    toast.success("Punto de fichaje guardado");
    setOpen(false);
    await load();
    onChanged?.();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Puntos de fichaje (kioscos)
            </CardTitle>
            <CardDescription>
              Cada punto agrupa las coordenadas cercanas (radio en metros) y define el centro de costo.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={detectar} disabled={loadingClusters}>
              {loadingClusters ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radar className="h-4 w-4 mr-2" />}
              Detectar desde fichajes
            </Button>
            <Button onClick={() => abrirNuevo()}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo punto
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Centro de costo</TableHead>
                <TableHead>Coordenadas</TableHead>
                <TableHead>Radio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {puntos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay puntos configurados
                  </TableCell>
                </TableRow>
              ) : (
                puntos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{sucursales.find((s) => s.id === p.sucursal_id)?.nombre || "—"}</TableCell>
                    <TableCell>{centros.find((c) => c.id === p.centro_costo_id)?.nombre || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {Number(p.latitud).toFixed(5)}, {Number(p.longitud).toFixed(5)}
                    </TableCell>
                    <TableCell>{p.radio_metros ?? 150} m</TableCell>
                    <TableCell>
                      <Badge variant={p.activa ? "default" : "secondary"}>{p.activa ? "Activo" : "Inactivo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => abrirEditar(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {clusters.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Coordenadas más frecuentes (últimos 90 días)</div>
            <div className="grid gap-2 md:grid-cols-2">
              {clusters.map((c) => (
                <div key={`${c.lat}-${c.lon}`} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-mono text-xs">
                      {Number(c.lat).toFixed(3)}, {Number(c.lon).toFixed(3)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {c.cantidad} fichajes · {c.punto_nombre ? `asignado a ${c.punto_nombre}` : "sin punto asignado"}
                    </div>
                  </div>
                  {!c.punto_nombre && (
                    <Button size="sm" variant="outline" onClick={() => abrirNuevo(c.lat, c.lon)}>
                      Crear punto
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar punto de fichaje" : "Nuevo punto de fichaje"}</DialogTitle>
            <DialogDescription>
              Definí el nombre del kiosco, sus coordenadas y el radio de tolerancia del GPS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Kiosco José Martí" />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitud</Label>
                <Input value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} />
              </div>
              <div>
                <Label>Longitud</Label>
                <Input value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Radio (metros)</Label>
                <Input type="number" value={form.radio_metros} onChange={(e) => setForm({ ...form, radio_metros: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch checked={form.activa} onCheckedChange={(v) => setForm({ ...form, activa: v })} />
                <span className="text-sm">Activo</span>
              </div>
            </div>
            <div>
              <Label>Sucursal</Label>
              <Select value={form.sucursal_id} onValueChange={(v) => setForm({ ...form, sucursal_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Sin sucursal —</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de costo</Label>
              <Select value={form.centro_costo_id} onValueChange={(v) => setForm({ ...form, centro_costo_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Sin centro de costo —</SelectItem>
                  {centros.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PuntosFichajeManager;
