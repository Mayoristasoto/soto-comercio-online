import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Copy, Loader2, MessageCircle, Star } from "lucide-react";
import {
  generarCodigo,
  type EncuestaConfig,
  type EncuestaPregunta,
  type EncuestaRespuestaItem,
} from "./encuestaTypes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sucursalId?: string | null;
  controlId?: string | null;
  onGuardado?: () => void;
}

export function EncuestaClienteDialog({ open, onOpenChange, sucursalId, controlId, onGuardado }: Props) {
  const [config, setConfig] = useState<EncuestaConfig | null>(null);
  const [preguntas, setPreguntas] = useState<EncuestaPregunta[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [sucursal, setSucursal] = useState<string>(sucursalId ?? "");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [valores, setValores] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardada, setGuardada] = useState<{ id: string; codigo: string; vence: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setGuardada(null);
    setNombre("");
    setEmail("");
    setTelefono("");
    setValores({});
    setSucursal(sucursalId ?? "");
    (async () => {
      setLoading(true);
      const db = supabase as any;
      const [cfg, pre, suc] = await Promise.all([
        db.from("encuesta_config").select("*").limit(1).maybeSingle(),
        db.from("encuesta_preguntas").select("*").eq("activa", true).order("orden"),
        db.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
      ]);
      setConfig(cfg.data ?? null);
      setPreguntas((pre.data ?? []) as EncuestaPregunta[]);
      setSucursales(suc.data ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sucursalId]);

  const faltantes = useMemo(
    () => preguntas.filter((p) => p.obligatoria && !valores[p.id]).length,
    [preguntas, valores]
  );

  const guardar = async () => {
    if (!nombre.trim()) {
      toast.error("Ingresá el nombre del cliente");
      return;
    }
    if (config?.telefono_obligatorio && !telefono.trim()) {
      toast.error("El teléfono es obligatorio");
      return;
    }
    if (faltantes > 0) {
      toast.error(`Faltan ${faltantes} respuesta(s) obligatoria(s)`);
      return;
    }
    setGuardando(true);
    try {
      const db = supabase as any;
      const items: EncuestaRespuestaItem[] = preguntas.map((p) => ({
        pregunta_id: p.id,
        pregunta: p.texto,
        tipo: p.tipo,
        valor: valores[p.id] ?? null,
      }));
      const estrellas = items
        .filter((i) => i.tipo === "estrellas" && typeof i.valor === "number")
        .map((i) => i.valor as number);
      const promedio = estrellas.length
        ? Math.round((estrellas.reduce((a, b) => a + b, 0) / estrellas.length) * 100) / 100
        : null;
      const comentario = items.find((i) => i.tipo === "texto")?.valor;
      const codigo = generarCodigo(config?.codigo_prefijo ?? "SOTO");
      const vence = new Date();
      vence.setDate(vence.getDate() + (config?.descuento_vigencia_dias ?? 30));
      const venceStr = vence.toISOString().slice(0, 10);

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await db
        .from("encuesta_respuestas")
        .insert({
          sucursal_id: sucursal || null,
          control_id: controlId ?? null,
          cliente_nombre: nombre.trim(),
          cliente_email: email.trim() || null,
          cliente_telefono: telefono.trim() || null,
          respuestas: items,
          promedio_estrellas: promedio,
          comentario: typeof comentario === "string" ? comentario : null,
          codigo_descuento: codigo,
          descuento_texto: config?.descuento_texto ?? null,
          descuento_vence: venceStr,
          registrado_por: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      setGuardada({ id: data.id, codigo, vence: venceStr });
      toast.success("Encuesta guardada");
      onGuardado?.();
    } catch (e: any) {
      toast.error("No se pudo guardar: " + (e.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const enviarWhatsapp = async () => {
    if (!guardada) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("encuesta-whatsapp", {
        body: { respuesta_id: guardada.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("WhatsApp enviado al cliente");
      onGuardado?.();
    } catch (e: any) {
      toast.error("No se pudo enviar el WhatsApp: " + (e.message || e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config?.titulo ?? "Encuesta de satisfacción"}</DialogTitle>
          <DialogDescription>{config?.bienvenida}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : guardada ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">{config?.agradecimiento}</p>
                <p className="text-muted-foreground">{config?.descuento_texto}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Código de descuento</p>
              <p className="text-2xl font-bold tracking-widest">{guardada.codigo}</p>
              <p className="text-xs text-muted-foreground">
                Válido hasta {new Date(`${guardada.vence}T00:00:00`).toLocaleDateString("es-AR")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard?.writeText(guardada.codigo);
                  toast.success("Código copiado");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar código
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={enviarWhatsapp}
                disabled={enviando || !telefono.trim() || !config?.whatsapp_activo}
              >
                {enviando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                Enviar por WhatsApp
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
            {!config?.whatsapp_activo && (
              <p className="text-xs text-muted-foreground">
                El envío automático está desactivado. Se activa en la configuración de la encuesta.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {!sucursalId && (
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select value={sucursal} onValueChange={setSucursal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná la sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {preguntas.map((p) => (
              <div key={p.id} className="space-y-2 border-b pb-4 last:border-b-0">
                <Label className="text-sm font-medium">
                  {p.texto}
                  {p.obligatoria && <span className="ml-1 text-destructive">*</span>}
                </Label>

                {p.tipo === "estrellas" && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} estrellas`}
                        onClick={() => setValores((v) => ({ ...v, [p.id]: n }))}
                        className="p-1"
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            Number(valores[p.id]) >= n
                              ? "fill-warning text-warning"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {p.tipo === "si_no" && (
                  <div className="flex gap-2">
                    {["Sí", "No"].map((op) => (
                      <Button
                        key={op}
                        type="button"
                        variant={valores[p.id] === op ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setValores((v) => ({ ...v, [p.id]: op }))}
                      >
                        {op}
                      </Button>
                    ))}
                  </div>
                )}

                {p.tipo === "opciones" && (
                  <div className="flex flex-wrap gap-2">
                    {(p.opciones || []).map((op) => (
                      <Button
                        key={op}
                        type="button"
                        size="sm"
                        variant={valores[p.id] === op ? "default" : "outline"}
                        onClick={() => setValores((v) => ({ ...v, [p.id]: op }))}
                      >
                        {op}
                      </Button>
                    ))}
                  </div>
                )}

                {p.tipo === "texto" && (
                  <Textarea
                    rows={3}
                    maxLength={1000}
                    value={String(valores[p.id] ?? "")}
                    onChange={(e) => setValores((v) => ({ ...v, [p.id]: e.target.value }))}
                    placeholder="Comentario del cliente..."
                  />
                )}
              </div>
            ))}

            <div className="space-y-3">
              <Badge variant="outline">Datos del cliente</Badge>
              <div className="space-y-2">
                <Label htmlFor="enc-nombre">Nombre *</Label>
                <Input id="enc-nombre" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
              </div>
              {config?.pide_email && (
                <div className="space-y-2">
                  <Label htmlFor="enc-email">Email (opcional)</Label>
                  <Input
                    id="enc-email"
                    type="email"
                    value={email}
                    maxLength={160}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
              {config?.pide_telefono && (
                <div className="space-y-2">
                  <Label htmlFor="enc-tel">
                    Teléfono (WhatsApp){config?.telefono_obligatorio ? " *" : " — opcional"}
                  </Label>
                  <Input
                    id="enc-tel"
                    inputMode="tel"
                    placeholder="5493514000000"
                    value={telefono}
                    maxLength={30}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {!guardada && !loading && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar y generar descuento
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
