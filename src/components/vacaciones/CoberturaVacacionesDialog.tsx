import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, MessageSquare, Send, Save } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type CoberturaTipo = "empleado" | "cambio_horario" | "sin_reemplazo" | "otra_sucursal";

export const COBERTURA_TIPO_LABEL: Record<CoberturaTipo, string> = {
  empleado: "Otro empleado cubre",
  cambio_horario: "Cambio de horario",
  sin_reemplazo: "Se cubre sin reemplazo",
  otra_sucursal: "Empleado de otra sucursal",
};

export const COBERTURA_ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente_rrhh: "Enviada a RRHH",
  cambios_sugeridos: "RRHH pidió cambios",
  aprobada: "Aprobada por RRHH",
};

interface DiaCobertura {
  id?: string;
  fecha: string;
  tipo: CoberturaTipo;
  empleado_cobertura_id: string | null;
  sucursal_origen_id: string | null;
  hora_entrada: string;
  hora_salida: string;
  observaciones: string;
}

interface Comentario {
  id: string;
  mensaje: string;
  autor_rol: string | null;
  created_at: string;
  empleados?: { nombre: string; apellido: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  solicitudId: string;
  empleadoNombre: string;
  fechaInicio: string;
  fechaFin: string;
  sucursalId: string | null;
  /** true = RRHH (solo lectura + sugerencias/comentarios), false = encargado (edita) */
  modoRRHH: boolean;
  onSaved?: () => void;
}

const rangoFechas = (inicio: string, fin: string) => {
  const out: string[] = [];
  const d = new Date(inicio + "T00:00:00");
  const end = new Date(fin + "T00:00:00");
  let guard = 0;
  while (d <= end && guard < 200) {
    out.push(format(d, "yyyy-MM-dd"));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
};

const diaLabel = (f: string) => format(new Date(f + "T00:00:00"), "EEEE d/MM", { locale: es });

export function CoberturaVacacionesDialog({
  open,
  onOpenChange,
  solicitudId,
  empleadoNombre,
  fechaInicio,
  fechaFin,
  sucursalId,
  modoRRHH,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coberturaId, setCoberturaId] = useState<string | null>(null);
  const [estado, setEstado] = useState<string>("borrador");
  const [comentarioEncargado, setComentarioEncargado] = useState("");
  const [dias, setDias] = useState<DiaCobertura[]>([]);
  const [empleados, setEmpleados] = useState<
    { id: string; nombre: string; apellido: string; sucursal_id: string | null }[]
  >([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");

  const fechas = useMemo(() => rangoFechas(fechaInicio, fechaFin), [fechaInicio, fechaFin]);
  const soloLectura = modoRRHH || (!modoRRHH && !["borrador", "cambios_sugeridos"].includes(estado));

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: emps }, { data: sucs }] = await Promise.all([
        supabase
          .from("empleados")
          .select("id, nombre, apellido, sucursal_id")
          .eq("activo", true)
          .order("apellido"),
        supabase.from("sucursales").select("id, nombre").order("nombre"),
      ]);
      setEmpleados((emps as any) || []);
      setSucursales((sucs as any) || []);

      const { data: cob } = await (supabase as any)
        .from("vacaciones_cobertura")
        .select("id, estado, comentario_encargado")
        .eq("solicitud_id", solicitudId)
        .maybeSingle();

      let diasExistentes: any[] = [];
      if (cob) {
        setCoberturaId(cob.id);
        setEstado(cob.estado || "borrador");
        setComentarioEncargado(cob.comentario_encargado || "");
        const { data: det } = await (supabase as any)
          .from("vacaciones_cobertura_dias")
          .select("*")
          .eq("cobertura_id", cob.id)
          .order("fecha");
        diasExistentes = det || [];
        const { data: coms } = await (supabase as any)
          .from("vacaciones_cobertura_comentarios")
          .select("id, mensaje, autor_rol, created_at, empleados:autor_id(nombre, apellido)")
          .eq("cobertura_id", cob.id)
          .order("created_at");
        setComentarios((coms as any) || []);
      } else {
        setCoberturaId(null);
        setEstado("borrador");
        setComentarioEncargado("");
        setComentarios([]);
      }

      setDias(
        fechas.map((f) => {
          const prev = diasExistentes.find((d) => d.fecha === f);
          return {
            id: prev?.id,
            fecha: f,
            tipo: (prev?.tipo as CoberturaTipo) || "empleado",
            empleado_cobertura_id: prev?.empleado_cobertura_id ?? null,
            sucursal_origen_id: prev?.sucursal_origen_id ?? null,
            hora_entrada: prev?.hora_entrada ? String(prev.hora_entrada).slice(0, 5) : "",
            hora_salida: prev?.hora_salida ? String(prev.hora_salida).slice(0, 5) : "",
            observaciones: prev?.observaciones || "",
          };
        })
      );
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al cargar la cobertura", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [solicitudId, fechas, toast]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const setDia = (fecha: string, patch: Partial<DiaCobertura>) =>
    setDias((prev) => prev.map((d) => (d.fecha === fecha ? { ...d, ...patch } : d)));

  const copiarADemas = (fecha: string) => {
    const base = dias.find((d) => d.fecha === fecha);
    if (!base) return;
    setDias((prev) =>
      prev.map((d) =>
        d.fecha === fecha
          ? d
          : {
              ...d,
              tipo: base.tipo,
              empleado_cobertura_id: base.empleado_cobertura_id,
              sucursal_origen_id: base.sucursal_origen_id,
              hora_entrada: base.hora_entrada,
              hora_salida: base.hora_salida,
              observaciones: base.observaciones,
            }
      )
    );
    toast({ title: "Día copiado al resto de los días" });
  };

  const empleadoActual = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("empleados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    return (data as any)?.id ?? null;
  };

  const guardar = async (enviar: boolean) => {
    setSaving(true);
    try {
      const empId = await empleadoActual();
      let cobId = coberturaId;
      const nuevoEstado = enviar ? "pendiente_rrhh" : estado === "aprobada" ? "aprobada" : "borrador";

      if (!cobId) {
        const { data, error } = await (supabase as any)
          .from("vacaciones_cobertura")
          .insert({
            solicitud_id: solicitudId,
            sucursal_id: sucursalId,
            creado_por: empId,
            estado: nuevoEstado,
            comentario_encargado: comentarioEncargado || null,
            enviado_at: enviar ? new Date().toISOString() : null,
          })
          .select("id")
          .single();
        if (error) throw error;
        cobId = data.id;
        setCoberturaId(cobId);
      } else {
        const { error } = await (supabase as any)
          .from("vacaciones_cobertura")
          .update({
            estado: nuevoEstado,
            comentario_encargado: comentarioEncargado || null,
            sucursal_id: sucursalId,
            enviado_at: enviar ? new Date().toISOString() : null,
          })
          .eq("id", cobId);
        if (error) throw error;
      }
      setEstado(nuevoEstado);

      const payload = dias.map((d) => ({
        cobertura_id: cobId,
        fecha: d.fecha,
        tipo: d.tipo,
        empleado_cobertura_id:
          d.tipo === "empleado" || d.tipo === "otra_sucursal" ? d.empleado_cobertura_id : null,
        sucursal_origen_id: d.tipo === "otra_sucursal" ? d.sucursal_origen_id : null,
        hora_entrada: d.hora_entrada || null,
        hora_salida: d.hora_salida || null,
        observaciones: d.observaciones || null,
      }));

      const { error: errDias } = await (supabase as any)
        .from("vacaciones_cobertura_dias")
        .upsert(payload, { onConflict: "cobertura_id,fecha" });
      if (errDias) throw errDias;

      toast({
        title: enviar ? "Cobertura enviada a RRHH" : "Cobertura guardada",
        description: enviar ? "RRHH va a revisarla antes de aprobar las vacaciones." : undefined,
      });
      onSaved?.();
      if (enviar) onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const agregarComentario = async (pedirCambios: boolean) => {
    if (!nuevoComentario.trim()) {
      toast({ title: "Escribí un comentario", variant: "destructive" });
      return;
    }
    if (!coberturaId) {
      toast({ title: "Todavía no hay una cobertura cargada", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const empId = await empleadoActual();
      const { error } = await (supabase as any)
        .from("vacaciones_cobertura_comentarios")
        .insert({
          cobertura_id: coberturaId,
          autor_id: empId,
          autor_rol: modoRRHH ? "admin_rrhh" : "gerente_sucursal",
          mensaje: nuevoComentario.trim(),
        });
      if (error) throw error;

      if (pedirCambios) {
        const { error: e2 } = await (supabase as any)
          .from("vacaciones_cobertura")
          .update({ estado: "cambios_sugeridos", comentario_rrhh: nuevoComentario.trim() })
          .eq("id", coberturaId);
        if (e2) throw e2;
        setEstado("cambios_sugeridos");
      }

      setNuevoComentario("");
      await cargar();
      onSaved?.();
      toast({ title: pedirCambios ? "Cambio sugerido al encargado" : "Comentario agregado" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const empleadosDeSucursal = (sucId: string | null) =>
    empleados.filter((e) => (sucId ? e.sucursal_id === sucId : true));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobertura de las vacaciones</DialogTitle>
          <DialogDescription>
            {empleadoNombre} · {diaLabel(fechaInicio)} al {diaLabel(fechaFin)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Badge variant={estado === "aprobada" ? "default" : "secondary"}>
            {COBERTURA_ESTADO_LABEL[estado] ?? estado}
          </Badge>
          <span className="text-xs text-muted-foreground">{dias.length} días a cubrir</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : (
          <div className="space-y-3">
            {dias.map((d) => (
              <div key={d.fecha} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize text-sm">{diaLabel(d.fecha)}</p>
                  {!soloLectura && (
                    <Button variant="ghost" size="sm" onClick={() => copiarADemas(d.fecha)}>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copiar a los demás días
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cómo se cubre</Label>
                    <Select
                      value={d.tipo}
                      disabled={soloLectura}
                      onValueChange={(v) => setDia(d.fecha, { tipo: v as CoberturaTipo })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(COBERTURA_TIPO_LABEL) as CoberturaTipo[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {COBERTURA_TIPO_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {d.tipo === "otra_sucursal" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sucursal de origen</Label>
                      <Select
                        value={d.sucursal_origen_id ?? "none"}
                        disabled={soloLectura}
                        onValueChange={(v) =>
                          setDia(d.fecha, {
                            sucursal_origen_id: v === "none" ? null : v,
                            empleado_cobertura_id: null,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Elegir sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin definir</SelectItem>
                          {sucursales.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(d.tipo === "empleado" || d.tipo === "otra_sucursal") && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quién cubre</Label>
                      <Select
                        value={d.empleado_cobertura_id ?? "none"}
                        disabled={soloLectura}
                        onValueChange={(v) =>
                          setDia(d.fecha, { empleado_cobertura_id: v === "none" ? null : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Elegir empleado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin definir</SelectItem>
                          {empleadosDeSucursal(
                            d.tipo === "otra_sucursal" ? d.sucursal_origen_id : sucursalId
                          ).map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.apellido}, {e.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {d.tipo !== "sin_reemplazo" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Entrada</Label>
                        <Input
                          type="time"
                          value={d.hora_entrada}
                          disabled={soloLectura}
                          onChange={(e) => setDia(d.fecha, { hora_entrada: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Salida</Label>
                        <Input
                          type="time"
                          value={d.hora_salida}
                          disabled={soloLectura}
                          onChange={(e) => setDia(d.fecha, { hora_salida: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Observaciones del día</Label>
                  <Input
                    value={d.observaciones}
                    disabled={soloLectura}
                    placeholder="Ej. entra 2 horas antes para abrir caja"
                    onChange={(e) => setDia(d.fecha, { observaciones: e.target.value })}
                  />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>Cómo funciona la sucursal esos días</Label>
              <Textarea
                rows={3}
                value={comentarioEncargado}
                disabled={soloLectura}
                placeholder="Explicá brevemente el funcionamiento de la sucursal durante esas vacaciones"
                onChange={(e) => setComentarioEncargado(e.target.value)}
              />
            </div>

            {(comentarios.length > 0 || modoRRHH) && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentarios y sugerencias
                </p>
                {comentarios.map((c) => (
                  <div key={c.id} className="rounded-md bg-muted/50 p-2 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {c.empleados ? `${c.empleados.nombre} ${c.empleados.apellido}` : "Usuario"} ·{" "}
                      {c.autor_rol === "admin_rrhh" ? "RRHH" : "Encargado"} ·{" "}
                      {format(new Date(c.created_at), "dd/MM HH:mm")}
                    </p>
                    <p>{c.mensaje}</p>
                  </div>
                ))}
                <Textarea
                  rows={2}
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder={
                    modoRRHH
                      ? "Sugerí un cambio o dejá un comentario para el encargado"
                      : "Respondé a RRHH"
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => agregarComentario(false)}
                  >
                    Agregar comentario
                  </Button>
                  {modoRRHH && (
                    <Button size="sm" variant="secondary" disabled={saving} onClick={() => agregarComentario(true)}>
                      Sugerir cambio al encargado
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!soloLectura && (
            <>
              <Button variant="secondary" disabled={saving} onClick={() => guardar(false)}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar borrador
              </Button>
              <Button disabled={saving} onClick={() => guardar(true)}>
                <Send className="h-4 w-4 mr-2" />
                Enviar a RRHH
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CoberturaVacacionesDialog;
