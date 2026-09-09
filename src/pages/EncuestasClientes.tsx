import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Smile,
  Star,
  Trash2,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { formatArgentinaDateTime } from "@/lib/dateUtils";
import { EncuestaClienteDialog } from "@/components/encuestas/EncuestaClienteDialog";
import {
  TIPO_LABEL,
  type EncuestaConfig,
  type EncuestaPregunta,
  type EncuestaRespuesta,
  type PreguntaTipo,
} from "@/components/encuestas/encuestaTypes";

export default function EncuestasClientes() {
  const { isAdmin } = usePermissions();
  const puedeConfigurar = isAdmin();
  const [config, setConfig] = useState<EncuestaConfig | null>(null);
  const [preguntas, setPreguntas] = useState<EncuestaPregunta[]>([]);
  const [respuestas, setRespuestas] = useState<EncuestaRespuesta[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<PreguntaTipo>("estrellas");

  const cargar = async () => {
    setLoading(true);
    const db = supabase as any;
    const [cfg, pre, res, suc] = await Promise.all([
      db.from("encuesta_config").select("*").limit(1).maybeSingle(),
      db.from("encuesta_preguntas").select("*").order("orden"),
      db.from("encuesta_respuestas").select("*").order("created_at", { ascending: false }).limit(300),
      db.from("sucursales").select("id, nombre").order("nombre"),
    ]);
    setConfig(cfg.data ?? null);
    setPreguntas((pre.data ?? []) as EncuestaPregunta[]);
    setRespuestas((res.data ?? []) as EncuestaRespuesta[]);
    setSucursales(suc.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const nombreSucursal = (id: string | null) => sucursales.find((s) => s.id === id)?.nombre ?? "—";

  const kpis = useMemo(() => {
    const total = respuestas.length;
    const conEstrellas = respuestas.filter((r) => r.promedio_estrellas != null);
    const promedio = conEstrellas.length
      ? conEstrellas.reduce((a, r) => a + Number(r.promedio_estrellas), 0) / conEstrellas.length
      : null;
    const enviados = respuestas.filter((r) => r.whatsapp_estado === "enviado").length;
    return { total, promedio, enviados };
  }, [respuestas]);

  const guardarConfig = async () => {
    if (!config) return;
    setGuardando(true);
    const db = supabase as any;
    const { id, ...rest } = config;
    const { error } = await db.from("encuesta_config").update(rest).eq("id", id);
    setGuardando(false);
    if (error) toast.error("No se pudo guardar: " + error.message);
    else toast.success("Configuración guardada");
  };

  const setCfg = <K extends keyof EncuestaConfig>(key: K, valor: EncuestaConfig[K]) =>
    setConfig((c) => (c ? { ...c, [key]: valor } : c));

  const agregarPregunta = async () => {
    if (!nuevaPregunta.trim()) return;
    const db = supabase as any;
    const { data, error } = await db
      .from("encuesta_preguntas")
      .insert({ texto: nuevaPregunta.trim(), tipo: nuevoTipo, orden: preguntas.length })
      .select("*")
      .single();
    if (error) {
      toast.error("No se pudo agregar: " + error.message);
      return;
    }
    setPreguntas((p) => [...p, data as EncuestaPregunta]);
    setNuevaPregunta("");
  };

  const actualizarPregunta = async (id: string, patch: Partial<EncuestaPregunta>) => {
    setPreguntas((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const db = supabase as any;
    const { error } = await db.from("encuesta_preguntas").update(patch).eq("id", id);
    if (error) toast.error("No se pudo guardar: " + error.message);
  };

  const eliminarPregunta = async (id: string) => {
    const db = supabase as any;
    const { error } = await db.from("encuesta_preguntas").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    setPreguntas((p) => p.filter((x) => x.id !== id));
  };

  const mover = async (index: number, delta: number) => {
    const destino = index + delta;
    if (destino < 0 || destino >= preguntas.length) return;
    const copia = [...preguntas];
    [copia[index], copia[destino]] = [copia[destino], copia[index]];
    const conOrden = copia.map((p, i) => ({ ...p, orden: i }));
    setPreguntas(conOrden);
    const db = supabase as any;
    await Promise.all(
      conOrden.map((p) => db.from("encuesta_preguntas").update({ orden: p.orden }).eq("id", p.id))
    );
  };

  const eliminarRespuesta = async (id: string) => {
    const db = supabase as any;
    const { error } = await db.from("encuesta_respuestas").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    setRespuestas((r) => r.filter((x) => x.id !== id));
  };

  const reenviar = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("encuesta-whatsapp", {
      body: { respuesta_id: id },
    });
    if (error || (data as any)?.error) {
      toast.error("No se pudo enviar: " + (error?.message || (data as any)?.error));
      return;
    }
    toast.success("WhatsApp enviado");
    cargar();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Smile className="h-6 w-6 text-primary" />
            Encuestas a clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Encuestá clientes en el salón, registrá sus datos y enviales un descuento por WhatsApp.
          </p>
        </div>
        <Button onClick={() => setNuevaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva encuesta
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Encuestas registradas</CardDescription>
            <CardTitle className="text-3xl">{kpis.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Promedio general</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              {kpis.promedio ? kpis.promedio.toFixed(2) : "—"}
              <Star className="h-5 w-5 fill-warning text-warning" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Descuentos enviados</CardDescription>
            <CardTitle className="text-3xl">{kpis.enviados}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="respuestas">
        <TabsList>
          <TabsTrigger value="respuestas">Respuestas</TabsTrigger>
          {puedeConfigurar && <TabsTrigger value="preguntas">Preguntas</TabsTrigger>}
          {puedeConfigurar && <TabsTrigger value="config">Configuración</TabsTrigger>}
        </TabsList>

        <TabsContent value="respuestas" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Promedio</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {respuestas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          Todavía no hay encuestas cargadas.
                        </TableCell>
                      </TableRow>
                    )}
                    {respuestas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatArgentinaDateTime(r.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{r.cliente_nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {[r.cliente_telefono, r.cliente_email].filter(Boolean).join(" · ") || "Sin contacto"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{nombreSucursal(r.sucursal_id)}</TableCell>
                        <TableCell className="text-sm">
                          {r.promedio_estrellas != null ? `${Number(r.promedio_estrellas).toFixed(2)} ★` : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{r.codigo_descuento ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.whatsapp_estado === "enviado"
                                ? "default"
                                : r.whatsapp_estado === "error"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {r.whatsapp_estado === "enviado"
                              ? "Enviado"
                              : r.whatsapp_estado === "error"
                                ? "Error"
                                : "Sin enviar"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {r.cliente_telefono && (
                              <Button variant="ghost" size="sm" onClick={() => reenviar(r.id)}>
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {puedeConfigurar && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => eliminarRespuesta(r.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {puedeConfigurar && (
          <TabsContent value="preguntas" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preguntas de la encuesta</CardTitle>
                <CardDescription>
                  Ordenalas, activalas o desactivalas. Se muestran solo las activas al encuestar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {preguntas.map((p, i) => (
                  <div key={p.id} className="space-y-3 rounded-lg border p-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={p.texto}
                        maxLength={300}
                        onChange={(e) => setPreguntas((prev) => prev.map((x) => (x.id === p.id ? { ...x, texto: e.target.value } : x)))}
                        onBlur={(e) => actualizarPregunta(p.id, { texto: e.target.value })}
                      />
                      <Select
                        value={p.tipo}
                        onValueChange={(v) => actualizarPregunta(p.id, { tipo: v as PreguntaTipo })}
                      >
                        <SelectTrigger className="sm:w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TIPO_LABEL) as PreguntaTipo[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {TIPO_LABEL[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {p.tipo === "opciones" && (
                      <Input
                        className="sm:w-56"
                        placeholder="Opciones separadas por coma"
                        defaultValue={(p.opciones || []).join(", ")}
                        onBlur={(e) =>
                          actualizarPregunta(p.id, {
                            opciones: e.target.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.obligatoria}
                          onCheckedChange={(v) => actualizarPregunta(p.id, { obligatoria: v })}
                        />
                        <span className="text-xs text-muted-foreground">Obligatoria</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.activa} onCheckedChange={(v) => actualizarPregunta(p.id, { activa: v })} />
                        <span className="text-xs text-muted-foreground">Activa</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => mover(i, -1)} aria-label="Subir">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => mover(i, 1)} aria-label="Bajar">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => eliminarPregunta(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
                  <Input
                    placeholder="Nueva pregunta"
                    value={nuevaPregunta}
                    maxLength={300}
                    onChange={(e) => setNuevaPregunta(e.target.value)}
                  />
                  <Select value={nuevoTipo} onValueChange={(v) => setNuevoTipo(v as PreguntaTipo)}>
                    <SelectTrigger className="sm:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPO_LABEL) as PreguntaTipo[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={agregarPregunta} disabled={!nuevaPregunta.trim()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {puedeConfigurar && config && (
          <TabsContent value="config" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Textos y datos del cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={config.titulo} maxLength={120} onChange={(e) => setCfg("titulo", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Texto de bienvenida</Label>
                  <Textarea
                    rows={2}
                    maxLength={400}
                    value={config.bienvenida}
                    onChange={(e) => setCfg("bienvenida", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de agradecimiento</Label>
                  <Textarea
                    rows={2}
                    maxLength={400}
                    value={config.agradecimiento}
                    onChange={(e) => setCfg("agradecimiento", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={config.pide_email} onCheckedChange={(v) => setCfg("pide_email", v)} />
                    <span className="text-sm">Pedir email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.pide_telefono} onCheckedChange={(v) => setCfg("pide_telefono", v)} />
                    <span className="text-sm">Pedir teléfono</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.telefono_obligatorio}
                      onCheckedChange={(v) => setCfg("telefono_obligatorio", v)}
                    />
                    <span className="text-sm">Teléfono obligatorio</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Descuento y WhatsApp</CardTitle>
                <CardDescription>
                  Variables disponibles en el mensaje: {"{nombre}"}, {"{descuento}"}, {"{codigo}"}, {"{vence}"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Beneficio para la próxima visita</Label>
                  <Input
                    value={config.descuento_texto}
                    maxLength={200}
                    onChange={(e) => setCfg("descuento_texto", e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vigencia (días)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={config.descuento_vigencia_dias}
                      onChange={(e) => setCfg("descuento_vigencia_dias", Number(e.target.value) || 30)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prefijo del código</Label>
                    <Input
                      value={config.codigo_prefijo}
                      maxLength={6}
                      onChange={(e) => setCfg("codigo_prefijo", e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={config.whatsapp_activo} onCheckedChange={(v) => setCfg("whatsapp_activo", v)} />
                  <span className="text-sm">Habilitar envío de WhatsApp</span>
                </div>
                <div className="space-y-2">
                  <Label>Dirección de la API de WhatsApp</Label>
                  <Input
                    value={config.whatsapp_api_url}
                    maxLength={300}
                    onChange={(e) => setCfg("whatsapp_api_url", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa el mismo token que el envío de avisos de fichaje. Si querés otro, se guarda como secreto
                    WHATSAPP_API_TOKEN.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Mensaje que recibe el cliente</Label>
                  <Textarea
                    rows={4}
                    maxLength={1000}
                    value={config.whatsapp_mensaje}
                    onChange={(e) => setCfg("whatsapp_mensaje", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={guardarConfig} disabled={guardando}>
                {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar configuración
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <EncuestaClienteDialog open={nuevaOpen} onOpenChange={setNuevaOpen} onGuardado={cargar} />
    </div>
  );
}
